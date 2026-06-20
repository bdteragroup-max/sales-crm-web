import React from 'react';
import { getUserCoins, getCoinTransactions } from '@/app/actions/coins';
import { Coins, History, ArrowDownLeft, ArrowUpRight, Award, Zap } from 'lucide-react';

export default async function CoinsDashboard() {
  const [coinsRes, txRes] = await Promise.all([
    getUserCoins(),
    getCoinTransactions(100)
  ]);

  const coins = (coinsRes.success && coinsRes.data) ? coinsRes.data : [];
  const transactions = (txRes.success && txRes.data) ? txRes.data : [];

  const getCoinStyle = (code: string) => {
    const c = code.toLowerCase();
    if (c.includes('gold')) return 'from-yellow-300 to-yellow-500 text-yellow-700 shadow-yellow-200 border-yellow-200';
    if (c.includes('silver')) return 'from-slate-200 to-slate-400 text-slate-700 shadow-slate-200 border-slate-300';
    if (c.includes('bronze')) return 'from-orange-300 to-orange-500 text-orange-800 shadow-orange-200 border-orange-300';
    return 'from-gray-100 to-gray-200 text-gray-700 shadow-gray-100 border-gray-200';
  };

  const getCoinIconStyle = (code: string) => {
    const c = code.toLowerCase();
    if (c.includes('gold')) return 'bg-yellow-100 text-yellow-600';
    if (c.includes('silver')) return 'bg-slate-100 text-slate-600';
    if (c.includes('bronze')) return 'bg-orange-100 text-orange-600';
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="flex-1 h-screen overflow-y-auto bg-gray-50 pb-20 custom-scrollbar relative">
      {/* Red accent header background (CRM Theme) */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-brand-red to-[#d01c00] rounded-b-[40px] shadow-xl z-0 pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-12">
        <header className="mb-8">
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Coins size={32} />
            เหรียญรางวัลของคุณ
          </h1>
          <p className="text-red-100 mt-2 font-medium">ภาพรวมยอดเหรียญสะสมและประวัติการทำรายการล่าสุด</p>
        </header>

        {/* Coins Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {coins?.map((coin: any) => {
            const style = getCoinStyle(coin.coin_types.code);
            return (
              <div 
                key={coin.id} 
                className={`bg-white rounded-3xl p-6 shadow-xl border-2 flex flex-col justify-between relative overflow-hidden transition-transform hover:-translate-y-1 ${style}`}
              >
                <div className="absolute -right-6 -top-6 opacity-10">
                  <Award size={120} />
                </div>
                
                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <h3 className="font-bold text-lg uppercase tracking-wider opacity-80">{coin.coin_types.name}</h3>
                    <p className="text-sm opacity-70 mt-1">{coin.coin_types.description}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${getCoinIconStyle(coin.coin_types.code)}`}>
                    <Coins size={24} strokeWidth={2.5} />
                  </div>
                </div>

                <div className="mt-8 relative z-10">
                  <span className="text-4xl font-black tracking-tighter number">{coin.balance.toLocaleString()}</span>
                  <span className="ml-2 font-bold opacity-70">เหรียญ</span>
                </div>
              </div>
            );
          })}
          {coins?.length === 0 && (
            <div className="col-span-full bg-white rounded-3xl p-8 text-center text-gray-500 shadow-xl">
              คุณยังไม่มีเหรียญสะสมในระบบ
            </div>
          )}
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden mb-12">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-brand-red">
              <History size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">ประวัติการทำรายการล่าสุด</h2>
          </div>

          <div className="divide-y divide-gray-100">
            {transactions?.length > 0 ? transactions.map((tx: any) => {
              const isSalesCrm = tx.source_key?.includes('sales_crm') || tx.description?.includes('deal_closed');
              const isPositive = tx.amount > 0;

              return (
                <div 
                  key={tx.id} 
                  className={`p-5 flex items-center justify-between transition-colors hover:bg-gray-50 ${isSalesCrm ? 'bg-red-50/30' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                      isPositive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {isPositive ? <ArrowDownLeft size={20} strokeWidth={2.5} /> : <ArrowUpRight size={20} strokeWidth={2.5} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-900 text-sm md:text-base">{tx.transaction_type}</h4>
                        {isSalesCrm && (
                          <span className="px-2 py-0.5 rounded-full bg-brand-red text-white text-[10px] font-bold flex items-center gap-1 uppercase tracking-wider">
                            <Zap size={10} />
                            Sales CRM
                          </span>
                        )}
                      </div>
                      <p className="text-xs md:text-sm text-gray-500 mt-1 max-w-lg truncate">{tx.description || tx.source_key || '-'}</p>
                      <p className="text-xs text-gray-400 mt-1">{new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(tx.created_at))}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className={`text-lg md:text-xl font-black number ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {isPositive ? '+' : ''}{tx.amount.toLocaleString()}
                    </div>
                    <div className="text-xs font-bold text-gray-500 uppercase flex items-center justify-end gap-1 mt-1">
                      <div className={`w-2 h-2 rounded-full ${getCoinIconStyle(tx.coin_types?.code).split(' ')[0]}`} />
                      {tx.coin_types?.name}
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="p-12 text-center text-gray-400 font-medium">
                ไม่มีประวัติการทำรายการ
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
