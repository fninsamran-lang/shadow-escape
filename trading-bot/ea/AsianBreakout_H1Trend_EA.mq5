//+------------------------------------------------------------------+
//| AsianBreakout_H1Trend_EA.mq5                                      |
//| XAUUSD M15: Asian range breakout, traded only with the H1 trend.  |
//|                                                                    |
//| Rules (all times UTC; the EA converts from broker server time):    |
//|  1. Range  = high/low of M15 bars that OPEN 00:00-05:45.           |
//|  2. Signal = first M15 bar that CLOSES beyond the range, bar open  |
//|              06:00-13:45, once per direction per day.             |
//|  3. Trend  = BUY only if that close is above the H1 EMA(200),      |
//|              SELL only if below.                                  |
//|  4. Exit   = SL 2.0*ATR(14), TP 3R, close any open trade 20:00.    |
//|  5. Max one position. Entry = market order on the next bar open.   |
//|                                                                    |
//| Safety (from the MTRADERS EAs, rewritten): max-spread guard,       |
//| daily-loss stop, equity-drawdown halt, risk-% lot sizing.          |
//| Optional (OFF by default): high-impact news blackout and an        |
//| external "news gate" file for a future AI/news service.            |
//|                                                                    |
//| NOT compiled/tested by the author - compile in MetaEditor (F7),    |
//| then compare the Strategy Tester trade list with                   |
//| results_mt5/reference_trades_asian_h1trend.csv before demo use.    |
//+------------------------------------------------------------------+
#property copyright "shadow-escape"
#property version   "1.00"

#include <Trade/Trade.mqh>

enum ENUM_RISK_MODE
  {
   RISK_LOW    = 0,   // Low:    0.5% per trade, daily stop 1.5%, halt at 10% drawdown
   RISK_MEDIUM = 1,   // Medium: 1.0% per trade, daily stop 3%,   halt at 20% drawdown
   RISK_HIGH   = 2,   // High:   2.0% per trade, daily stop 5%,   halt at 35% drawdown
   RISK_CUSTOM = 3    // Custom: use the three values below
  };

//--- strategy
input group "Strategy (UTC hours)"
input int    InpRangeEndUTC      = 6;      // range = bars opening before this hour (00:00..)
input int    InpTradeEndUTC      = 14;     // breakout bars must open before this hour
input int    InpExitUTC          = 20;     // close open trades from this hour
input int    InpHtfEmaPeriod     = 200;    // H1 EMA period for the trend filter
input int    InpAtrPeriod        = 14;     // M15 ATR period
input double InpSlAtrMult        = 2.0;    // stop loss = mult * ATR
input double InpTpR              = 3.0;    // take profit in multiples of the risk

input group "Broker time"
input int    InpServerOffsetWinter = 2;    // server GMT offset in winter (GMT+2 -> 2)
input bool   InpServerUsesUsDst    = true; // server adds +1h during US daylight saving time

input group "Risk (entry rules are identical in every mode; only money management changes)"
input ENUM_RISK_MODE InpRiskMode = RISK_MEDIUM; // risk mode
input double InpRiskPercent      = 1.0;    // CUSTOM only: risk per trade, % of equity
input double InpDailyLossPct     = 3.0;    // CUSTOM only: stop new entries after this % loss today (0 = off)
input double InpMaxDrawdownPct   = 20.0;   // CUSTOM only: halt new entries at this % equity drawdown (0 = off)
input double InpMaxSpreadPrice   = 0.50;   // skip entries if spread (price units, $) is wider
input int    InpDeviationPoints  = 30;     // max slippage in points
input long   InpMagic            = 150615; // magic number

input group "Optional: news blackout (live only, not in Strategy Tester)"
input bool   InpUseCalendar      = false;  // block entries around high-impact news
input string InpCalendarCurrency = "USD";
input int    InpCalMinutesBefore = 30;
input int    InpCalMinutesAfter  = 30;

input group "Signal log (recommended for judging the AI filter later)"
input bool   InpLogSignals       = true;   // append every signal, taken or skipped, to signals_log.csv (common Files)

input group "Optional: external news gate file (future AI service)"
input bool   InpUseGateFile      = false;  // if true: no valid gate file -> NO new entries
input string InpGateFile         = "news_gate.txt"; // in the common Files folder

CTrade   g_trade;
int      g_atrHandle  = INVALID_HANDLE;
int      g_emaHandle  = INVALID_HANDLE;
datetime g_lastBar    = 0;
string   g_peakKey;
bool     g_calWarned  = false;
double   g_riskPct = 1.0, g_dailyLossPct = 3.0, g_ddHaltPct = 20.0;   // effective values for the chosen mode

//+------------------------------------------------------------------+
//| time helpers                                                      |
//+------------------------------------------------------------------+
// n-th Sunday (1-based) of a month, as a date at 00:00
datetime NthSunday(int year, int month, int n)
  {
   MqlDateTime d;
   d.year = year; d.mon = month; d.day = 1; d.hour = 0; d.min = 0; d.sec = 0;
   datetime first = StructToTime(d);
   TimeToStruct(first, d);
   int firstSunday = 1 + (7 - d.day_of_week) % 7;      // day_of_week: 0 = Sunday
   return first + (datetime)((firstSunday - 1 + 7 * (n - 1)) * 86400);
  }

// US DST is active between the 2nd Sunday of March and the 1st Sunday of November
bool UsDstActive(datetime serverTime)
  {
   MqlDateTime d;
   TimeToStruct(serverTime, d);
   datetime start = NthSunday(d.year, 3, 2);
   datetime end   = NthSunday(d.year, 11, 1);
   return (serverTime >= start && serverTime < end);
  }

int ServerOffsetHours(datetime serverTime)
  {
   int off = InpServerOffsetWinter;
   if(InpServerUsesUsDst && UsDstActive(serverTime))
      off += 1;
   return off;
  }

datetime ServerToUtc(datetime serverTime)
  {
   return serverTime - ServerOffsetHours(serverTime) * 3600;
  }

//+------------------------------------------------------------------+
//| helpers                                                           |
//+------------------------------------------------------------------+
bool HasPosition()
  {
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      if(PositionGetString(POSITION_SYMBOL) == _Symbol &&
         PositionGetInteger(POSITION_MAGIC) == InpMagic)
         return true;
     }
   return false;
  }

void CloseOurPositions(const string why)
  {
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol ||
         PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
      if(g_trade.PositionClose(ticket))
         PrintFormat("Closed #%I64u (%s)", ticket, why);
      else
         PrintFormat("Close #%I64u failed: %d", ticket, GetLastError());
     }
  }

// realised + floating P/L of this EA since the start of the current server day
double TodayPnl()
  {
   MqlDateTime d;
   TimeToStruct(TimeTradeServer(), d);
   d.hour = 0; d.min = 0; d.sec = 0;
   datetime dayStart = StructToTime(d);
   double pnl = 0.0;
   if(HistorySelect(dayStart, TimeTradeServer() + 60))
     {
      for(int i = HistoryDealsTotal() - 1; i >= 0; i--)
        {
         ulong t = HistoryDealGetTicket(i);
         if(HistoryDealGetInteger(t, DEAL_MAGIC) != InpMagic) continue;
         if(HistoryDealGetString(t, DEAL_SYMBOL) != _Symbol) continue;
         if(HistoryDealGetInteger(t, DEAL_ENTRY) != DEAL_ENTRY_OUT) continue;
         pnl += HistoryDealGetDouble(t, DEAL_PROFIT) + HistoryDealGetDouble(t, DEAL_COMMISSION) +
                HistoryDealGetDouble(t, DEAL_SWAP);
        }
     }
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      if(PositionGetString(POSITION_SYMBOL) == _Symbol && PositionGetInteger(POSITION_MAGIC) == InpMagic)
         pnl += PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP);
     }
   return pnl;
  }

// highest equity seen, stored in a terminal global variable so it survives restarts
void UpdatePeak()
  {
   double eq = AccountInfoDouble(ACCOUNT_EQUITY);
   if(!GlobalVariableCheck(g_peakKey) || eq > GlobalVariableGet(g_peakKey))
      GlobalVariableSet(g_peakKey, eq);
  }

bool DrawdownHalted()
  {
   if(g_ddHaltPct <= 0.0) return false;
   double eq = AccountInfoDouble(ACCOUNT_EQUITY);
   double peak = GlobalVariableCheck(g_peakKey) ? GlobalVariableGet(g_peakKey) : eq;
   return ((peak - eq) / peak * 100.0 >= g_ddHaltPct);
  }

bool NewsBlackout()
  {
   if(!InpUseCalendar) return false;
   MqlCalendarValue values[];
   datetime now = TimeTradeServer();
   datetime from = now - InpCalMinutesAfter * 60;
   datetime to   = now + InpCalMinutesBefore * 60;
   if(!CalendarValueHistory(values, from, to, NULL, InpCalendarCurrency))
     {
      if(!g_calWarned) { Print("Calendar not available (Strategy Tester?). News blackout ignored."); g_calWarned = true; }
      return false;
     }
   for(int i = 0; i < ArraySize(values); i++)
     {
      MqlCalendarEvent ev;
      if(!CalendarEventById(values[i].event_id, ev)) continue;
      if(ev.importance == CALENDAR_IMPORTANCE_HIGH)
        {
         PrintFormat("News blackout: high-impact event id %I64u at %s", values[i].event_id, TimeToString(values[i].time));
         return true;
        }
     }
   return false;
  }

// Gate file (written by an external service), simple key=value lines, e.g.
//   decision=approve        (approve | reduce | reject)
//   size=0.5                (lot multiplier, used when decision=reduce)
//   allow_buy=1             (optional, 0 blocks buys)
//   allow_sell=1            (optional, 0 blocks sells)
//   valid_until_utc=1764250000   (unix seconds)
// returns false = do not trade. sizeMult is set to the lot multiplier.
bool GateAllows(double &sizeMult, bool &allowBuy, bool &allowSell)
  {
   sizeMult = 1.0; allowBuy = true; allowSell = true;
   if(!InpUseGateFile) return true;
   int h = FileOpen(InpGateFile, FILE_READ | FILE_TXT | FILE_ANSI | FILE_COMMON);
   if(h == INVALID_HANDLE) { Print("Gate: file missing -> no entry"); return false; }
   string decision = "";
   double size = 1.0;
   long validUntil = 0;
   while(!FileIsEnding(h))
     {
      string line = FileReadString(h);
      int p = StringFind(line, "=");
      if(p < 0) continue;
      string k = StringSubstr(line, 0, p), v = StringSubstr(line, p + 1);
      StringTrimLeft(k); StringTrimRight(k); StringTrimLeft(v); StringTrimRight(v);
      StringToLower(k);
      if(k == "decision") { StringToLower(v); decision = v; }
      else if(k == "size") size = StringToDouble(v);
      else if(k == "allow_buy")  allowBuy  = (StringToInteger(v) != 0);
      else if(k == "allow_sell") allowSell = (StringToInteger(v) != 0);
      else if(k == "valid_until_utc") validUntil = StringToInteger(v);
     }
   FileClose(h);
   datetime nowUtc = ServerToUtc(TimeTradeServer());
   if(validUntil <= 0 || (long)nowUtc > validUntil) { Print("Gate: stale/expired -> no entry"); return false; }
   if(decision == "approve") return true;
   if(decision == "reduce")  { sizeMult = MathMax(0.1, MathMin(1.0, size)); return true; }
   Print("Gate: decision=", decision, " -> no entry");
   return false;
  }

double CalcLots(const ENUM_ORDER_TYPE type, const double price, const double slDistance, const double mult)
  {
   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   double riskMoney = equity * g_riskPct / 100.0 * mult;
   double slPrice = (type == ORDER_TYPE_BUY) ? price - slDistance : price + slDistance;
   double profit = 0.0;
   if(!OrderCalcProfit(type, _Symbol, 1.0, price, slPrice, profit) || profit >= 0.0)
     { Print("OrderCalcProfit failed"); return 0.0; }
   double lossPerLot = -profit;
   double lots = riskMoney / lossPerLot;
   double step = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   double vmin = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double vmax = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   lots = MathFloor(lots / step) * step;
   if(lots < vmin)
     {
      PrintFormat("Lot %.4f below minimum %.2f -> skipped (would exceed risk budget)", lots, vmin);
      return 0.0;
     }
   return MathMin(lots, vmax);
  }

//+------------------------------------------------------------------+
//| signal: evaluated once when a new M15 bar opens (bar 1 just closed)|
//| returns +1 buy, -1 sell, 0 none                                    |
//+------------------------------------------------------------------+
int Signal(double &atrOut)
  {
   MqlRates rates[];
   ArraySetAsSeries(rates, true);
   int n = CopyRates(_Symbol, PERIOD_M15, 0, 200, rates);
   if(n < 150) return 0;                                               // need ~2 days of bars

   datetime sigOpenUtc = ServerToUtc(rates[1].time);
   MqlDateTime s;
   TimeToStruct(sigOpenUtc, s);
   if(s.hour < InpRangeEndUTC || s.hour >= InpTradeEndUTC) return 0;   // outside breakout window
   int today = s.year * 10000 + s.mon * 100 + s.day;

   // 1) Asian range of today's UTC date
   double hi = -DBL_MAX, lo = DBL_MAX;
   for(int i = 1; i < n; i++)
     {
      MqlDateTime d;
      TimeToStruct(ServerToUtc(rates[i].time), d);
      int key = d.year * 10000 + d.mon * 100 + d.day;
      if(key < today) break;
      if(key == today && d.hour < InpRangeEndUTC)
        {
         hi = MathMax(hi, rates[i].high);
         lo = MathMin(lo, rates[i].low);
        }
     }
   if(hi < lo) return 0;                                               // no range bars yet today

   // 2) was there an earlier breakout today in the same direction? (first one only, as in the backtest)
   bool earlierUp = false, earlierDn = false;
   for(int i = 2; i < n; i++)
     {
      MqlDateTime d;
      TimeToStruct(ServerToUtc(rates[i].time), d);
      int key = d.year * 10000 + d.mon * 100 + d.day;
      if(key < today) break;
      if(key == today && d.hour >= InpRangeEndUTC && d.hour < InpTradeEndUTC)
        {
         if(rates[i].close > hi) earlierUp = true;
         if(rates[i].close < lo) earlierDn = true;
        }
     }
   bool rawUp = (rates[1].close > hi) && !earlierUp;
   bool rawDn = (rates[1].close < lo) && !earlierDn;
   if(!rawUp && !rawDn) return 0;

   // 3) H1 trend filter + ATR
   double ema[1], atr[1];
   if(CopyBuffer(g_emaHandle, 0, 1, 1, ema) != 1) return 0;           // last completed H1 bar
   if(CopyBuffer(g_atrHandle, 0, 1, 1, atr) != 1) return 0;           // ATR of the signal bar
   atrOut = atr[0];
   if(rawUp && rates[1].close > ema[0]) return 1;
   if(rawDn && rates[1].close < ema[0]) return -1;
   return 0;
  }

// one line per candidate signal: taken, or skipped with the reason
void LogSignal(const string status, const int sig, const double refPrice,
               const double slDist, const double tpDist, const double sizeMult)
  {
   if(!InpLogSignals) return;
   int h = FileOpen("signals_log.csv", FILE_READ | FILE_WRITE | FILE_TXT | FILE_ANSI | FILE_COMMON);
   if(h == INVALID_HANDLE) return;
   if(FileSize(h) == 0)
      FileWriteString(h, "signal_bar_utc,symbol,side,ref_price,sl_dist,tp_dist,status,size_mult\r\n");
   FileSeek(h, 0, SEEK_END);
   string t = TimeToString(ServerToUtc(iTime(_Symbol, PERIOD_M15, 1)), TIME_DATE | TIME_MINUTES);
   FileWriteString(h, StringFormat("%s,%s,%s,%.2f,%.2f,%.2f,%s,%.2f\r\n", t, _Symbol,
                   sig > 0 ? "buy" : "sell", refPrice, slDist, tpDist, status, sizeMult));
   FileClose(h);
  }

//+------------------------------------------------------------------+
int OnInit()
  {
   g_atrHandle = iATR(_Symbol, PERIOD_M15, InpAtrPeriod);
   g_emaHandle = iMA(_Symbol, PERIOD_H1, InpHtfEmaPeriod, 0, MODE_EMA, PRICE_CLOSE);
   if(g_atrHandle == INVALID_HANDLE || g_emaHandle == INVALID_HANDLE)
     { Print("Indicator handle failed"); return INIT_FAILED; }
   switch(InpRiskMode)
     {
      case RISK_LOW:    g_riskPct = 0.5; g_dailyLossPct = 1.5; g_ddHaltPct = 10.0; break;
      case RISK_MEDIUM: g_riskPct = 1.0; g_dailyLossPct = 3.0; g_ddHaltPct = 20.0; break;
      case RISK_HIGH:   g_riskPct = 2.0; g_dailyLossPct = 5.0; g_ddHaltPct = 35.0; break;
      default:          g_riskPct = InpRiskPercent; g_dailyLossPct = InpDailyLossPct; g_ddHaltPct = InpMaxDrawdownPct; break;
     }
   if(g_riskPct <= 0.0 || g_riskPct > 5.0)
     { Print("Risk per trade must be between 0 and 5 %"); return INIT_PARAMETERS_INCORRECT; }
   PrintFormat("Risk mode: %s | risk/trade %.2f%% | daily stop %.1f%% | drawdown halt %.1f%%",
               EnumToString(InpRiskMode), g_riskPct, g_dailyLossPct, g_ddHaltPct);
   g_trade.SetExpertMagicNumber(InpMagic);
   g_trade.SetDeviationInPoints(InpDeviationPoints);
   g_trade.SetTypeFillingBySymbol(_Symbol);
   g_peakKey = StringFormat("ABE_PEAK_%I64d_%I64d", AccountInfoInteger(ACCOUNT_LOGIN), InpMagic);
   if(Period() != PERIOD_M15)
      Print("Warning: attach to an M15 chart (signals are evaluated on M15 bars).");
   return INIT_SUCCEEDED;
  }

void OnDeinit(const int reason)
  {
   if(g_atrHandle != INVALID_HANDLE) IndicatorRelease(g_atrHandle);
   if(g_emaHandle != INVALID_HANDLE) IndicatorRelease(g_emaHandle);
  }

void OnTick()
  {
   UpdatePeak();

   // time exit: close anything still open from the exit hour on
   MqlDateTime u;
   TimeToStruct(ServerToUtc(TimeTradeServer()), u);
   if(u.hour >= InpExitUTC && HasPosition())
      CloseOurPositions("time exit");

   // act once per new M15 bar
   datetime barTime = iTime(_Symbol, PERIOD_M15, 0);
   if(barTime == g_lastBar) return;
   g_lastBar = barTime;

   if(HasPosition()) return;
   if(u.hour >= InpExitUTC) return;

   double atr = 0.0;
   int sig = Signal(atr);
   if(sig == 0 || atr <= 0.0) return;

   // candidate signal: compute the levels first so every skipped signal can be logged and judged later
   double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK), bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   double slDist = InpSlAtrMult * atr;
   double tpDist = slDist * InpTpR;
   double refPrice = (sig > 0) ? ask : bid;
   double sizeMult = 1.0;
   bool   allowBuy = true, allowSell = true;
   string skip = "";
   if(ask - bid > InpMaxSpreadPrice)                         skip = "spread";
   else if(DrawdownHalted())                                 skip = "drawdown_halt";
   else if(g_dailyLossPct > 0.0 &&
           TodayPnl() <= -AccountInfoDouble(ACCOUNT_EQUITY) * g_dailyLossPct / 100.0) skip = "daily_loss";
   else if(NewsBlackout())                                   skip = "news_blackout";
   else if(!GateAllows(sizeMult, allowBuy, allowSell))       skip = "gate_blocked";
   else if((sig > 0 && !allowBuy) || (sig < 0 && !allowSell)) skip = "gate_direction";
   if(skip != "")
     {
      PrintFormat("Skip signal (%s)", skip);
      LogSignal(skip, sig, refPrice, slDist, tpDist, sizeMult);
      return;
     }

   // order
   int digits = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);
   double stopsLevel = SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * _Point;
   if(slDist < stopsLevel)
     { Print("Skip: SL distance below broker stop level"); LogSignal("stops_level", sig, refPrice, slDist, tpDist, sizeMult); return; }

   if(sig > 0)
     {
      double lots = CalcLots(ORDER_TYPE_BUY, ask, slDist, sizeMult);
      if(lots <= 0.0) { LogSignal("lot_too_small", sig, refPrice, slDist, tpDist, sizeMult); return; }
      g_trade.Buy(lots, _Symbol, ask, NormalizeDouble(ask - slDist, digits), NormalizeDouble(ask + tpDist, digits), "asian-h1trend");
     }
   else
     {
      double lots = CalcLots(ORDER_TYPE_SELL, bid, slDist, sizeMult);
      if(lots <= 0.0) { LogSignal("lot_too_small", sig, refPrice, slDist, tpDist, sizeMult); return; }
      g_trade.Sell(lots, _Symbol, bid, NormalizeDouble(bid + slDist, digits), NormalizeDouble(bid - tpDist, digits), "asian-h1trend");
     }
   PrintFormat("Order sent: %s lots/SL/TP result=%d", sig > 0 ? "BUY" : "SELL", g_trade.ResultRetcode());
   LogSignal("taken", sig, refPrice, slDist, tpDist, sizeMult);
  }
//+------------------------------------------------------------------+
