import React from 'react';
import { getUserCoins, getCoinTransactions } from '@/app/actions/coins';
import Image from 'next/image';
import { Coins, History, ArrowDownLeft, ArrowUpRight, Award, Zap } from 'lucide-react';

export default async function CoinsDashboard() {
  const [coinsRes, txRes] = await Promise.all([
    getUserCoins(),
    getCoinTransactions(100)
  ]);

  const coins = (coinsRes.success && coinsRes.data) ? coinsRes.data : [];
  const transactions = (txRes.success && txRes.data) ? txRes.data : [];

  const getCoinStyle = (code?: string, name?: string) => {
    const c = (code || '').toLowerCase() + ' ' + (name || '').toLowerCase();
    if (c.includes('bronze') || c.includes('ทองแดง') || c.includes('copper')) return 'from-orange-300 to-orange-500 text-orange-800 shadow-orange-200 border-orange-300';
    if (c.includes('gold') || c.includes('ทอง')) return 'from-yellow-300 to-yellow-500 text-yellow-700 shadow-yellow-200 border-yellow-200';
    if (c.includes('silver') || c.includes('เงิน')) return 'from-slate-200 to-slate-400 text-slate-700 shadow-slate-200 border-slate-300';
    if (c.includes('task') || c.includes('ภารกิจ') || c.includes('kpi')) return 'from-amber-600 to-orange-800 text-amber-900 shadow-orange-900/20 border-orange-800/30';
    return 'from-gray-100 to-gray-200 text-gray-700 shadow-gray-100 border-gray-200';
  };

  const getCoinIconStyle = (code?: string, name?: string) => {
    const c = (code || '').toLowerCase() + ' ' + (name || '').toLowerCase();
    if (c.includes('bronze') || c.includes('ทองแดง') || c.includes('copper')) return 'bg-orange-100 text-orange-600';
    if (c.includes('gold') || c.includes('ทอง')) return 'bg-yellow-100 text-yellow-600';
    if (c.includes('silver') || c.includes('เงิน')) return 'bg-slate-100 text-slate-600';
    if (c.includes('task') || c.includes('ภารกิจ') || c.includes('kpi')) return 'bg-amber-100 text-amber-700';
    return 'bg-gray-100 text-gray-600';
  };

  const getCoinImagePath = (code?: string, name?: string) => {
    const c = (code || '').toLowerCase() + ' ' + (name || '').toLowerCase();
    if (c.includes('bronze') || c.includes('ทองแดง') || c.includes('copper')) return { front: '/coins/bronze.png', back: '/coins/bronze_back.png' };
    if (c.includes('silver') || c.includes('เงิน')) return { front: '/coins/silver.png', back: '/coins/silver_back.png' };
    if (c.includes('event') || c.includes('กิจกรรม')) return { front: '/coins/event.png', back: '/coins/event_back.png' };
    if (c.includes('task') || c.includes('ภารกิจ')) return { front: '/coins/task.png', back: '/coins/task_back.png' };
    if (c.includes('milestone')) return { front: '/coins/milestone.png', back: '/coins/milestone_back.png' };
    if (c.includes('kpi')) return { front: '/coins/kpi.png', back: '/coins/kpi_back.png' };
    if (c.includes('gold') || c.includes('ทอง')) return { front: '/coins/gold.png', back: '/coins/gold_back.png' };
    return { front: '/coins/gold.png', back: '/coins/gold_back.png' }; // default fallback
  };

  const getCoinScaleClass = (code?: string, name?: string) => {
    // All images are now perfectly cropped and matched, no artificial scaling needed!
    return "scale-100";
  };

  const translateCoinName = (name?: string) => {
    if (!name) return '';
    const n = name.toLowerCase();
    if (n.includes('gold')) return 'เหรียญทอง';
    if (n.includes('silver')) return 'เหรียญเงิน';
    if (n.includes('bronze')) return 'เหรียญทองแดง';
    if (n.includes('copper')) return 'เหรียญทองแดง (Copper)';
    if (n.includes('task')) return 'เหรียญภารกิจ';
    return name;
  };

  const translateCoinDescription = (desc?: string) => {
    if (!desc) return '';
    const d = desc.toLowerCase();
    if (d.includes('daily check-in')) return 'ได้รับจากการเข้าสู่ระบบรายวัน';
    if (d.includes('department head')) return 'ได้รับจากหัวหน้าแผนกเมื่อทำภารกิจสำเร็จ';
    return desc;
  };

  const translateTxType = (type?: string) => {
    if (!type) return '-';
    const t = type.toLowerCase();
    if (t === 'earn') return 'ได้รับเหรียญ';
    if (t === 'spend') return 'ใช้เหรียญ';
    if (t === 'deduct') return 'หักเหรียญ';
    if (t === 'refund') return 'คืนเหรียญ';
    if (t === 'adjustment') return 'ปรับปรุงยอด';
    return type;
  };

  const translateDescription = (desc?: string) => {
    if (!desc) return '-';
    const d = desc.toLowerCase();
    if (d.includes('deal_closed') || d.includes('won')) return 'ได้รับรางวัลจากปิดดีลการขายสำเร็จ';
    if (d.includes('manual_adjustment')) return 'ปรับปรุงยอดโดยแอดมิน';
    if (d.includes('sales_crm')) return 'รายการจากระบบ Sales CRM';
    return desc;
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
            const style = getCoinStyle(coin.coin_types.code, coin.coin_types.name);
            return (
              <div 
                key={coin.id} 
                className={`bg-white rounded-[2.5rem] p-6 md:p-8 shadow-2xl border flex flex-col items-center text-center relative overflow-hidden transition-transform duration-500 hover:-translate-y-2 group ${style}`}
              >
                {/* Huge faded background icon */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.04] pointer-events-none">
                  <Award size={280} className="scale-75 md:scale-100" />
                </div>
                
                {/* Huge Centered Coin */}
                <div 
                  className="w-32 h-32 md:w-44 md:h-44 relative mb-4 md:mb-6" 
                  style={{ perspective: '1200px' }}
                >
                  <div 
                    className="w-full h-full transition-transform duration-1000 relative overflow-visible"
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    <style dangerouslySetInnerHTML={{__html: `
                      .group:hover .coin-flipper-${coin.id} { transform: rotateY(180deg) scale(1.1); }
                    `}} />
                    <div className={`absolute inset-0 w-full h-full coin-flipper-${coin.id}`} style={{ transformStyle: 'preserve-3d', transition: 'transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
                      {/* Front */}
                      <div className="absolute inset-0 w-full h-full backface-hidden flex items-center justify-center" style={{ backfaceVisibility: 'hidden' }}>
                        <Image 
                          src={getCoinImagePath(coin.coin_types.code, coin.coin_types.name).front} 
                          alt={translateCoinName(coin.coin_types.name)}
                          fill
                          unoptimized={true}
                          className={`object-contain mix-blend-multiply transition-transform duration-500 ${getCoinScaleClass(coin.coin_types.code, coin.coin_types.name)}`}
                        />
                      </div>
                      {/* Back */}
                      <div className="absolute inset-0 w-full h-full backface-hidden flex items-center justify-center" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                        <Image 
                          src={getCoinImagePath(coin.coin_types.code, coin.coin_types.name).back} 
                          alt={translateCoinName(coin.coin_types.name)}
                          fill
                          unoptimized={true}
                          className={`object-contain mix-blend-multiply transition-transform duration-500 ${getCoinScaleClass(coin.coin_types.code, coin.coin_types.name)}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Coin Text */}
                <div className="relative z-10 w-full mb-4 md:mb-6 flex-1 flex flex-col justify-end">
                  <h3 className="font-black text-xl md:text-2xl uppercase tracking-widest opacity-90 mb-1 md:mb-2">{translateCoinName(coin.coin_types.name)}</h3>
                  <p className="text-xs md:text-sm opacity-80 leading-relaxed font-medium">{translateCoinDescription(coin.coin_types.description)}</p>
                </div>

                {/* Coin Balance */}
                <div className="relative z-10 w-full pt-4 md:pt-6 border-t border-black/10">
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-5xl md:text-6xl font-black tracking-tighter number drop-shadow-sm">{coin.balance.toLocaleString()}</span>
                    <span className="font-bold opacity-80 text-base md:text-lg uppercase tracking-widest">เหรียญ</span>
                  </div>
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
                        <h4 className="font-bold text-gray-900 text-sm md:text-base">{translateTxType(tx.transaction_type)}</h4>
                        {isSalesCrm && (
                          <span className="px-2 py-0.5 rounded-full bg-brand-red text-white text-[10px] font-bold flex items-center gap-1 uppercase tracking-wider">
                            <Zap size={10} />
                            Sales CRM
                          </span>
                        )}
                      </div>
                      <p className="text-xs md:text-sm text-gray-500 mt-1 max-w-lg truncate">{translateDescription(tx.description || tx.source_key)}</p>
                      <p className="text-xs text-gray-400 mt-1">{new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(tx.created_at))}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className={`text-lg md:text-xl font-black number ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {isPositive ? '+' : ''}{tx.amount.toLocaleString()}
                    </div>
                    <div className="text-xs font-bold text-gray-500 uppercase flex items-center justify-end gap-2 mt-1">
                      <div className="w-5 h-5 relative shrink-0">
                        <Image src={getCoinImagePath(tx.coin_types?.code, tx.coin_types?.name).front} alt="coin" fill unoptimized={true} className="object-contain mix-blend-multiply" />
                      </div>
                      {translateCoinName(tx.coin_types?.name)}
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
