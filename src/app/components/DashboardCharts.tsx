import { 
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, ComposedChart, BarChart, Bar, Cell as RechartsCell, ReferenceLine, LabelList
} from 'recharts';

export function SalesOverviewChart({ data, visibleSeries, dailyTarget, showMoMOverlay }: { data: any[], visibleSeries: any, dailyTarget?: number, showMoMOverlay?: boolean }) {
  if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-gray-400">กำลังโหลดข้อมูล...</div>;

  const hasDailyTarget = dailyTarget && dailyTarget > 0;

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ff2301" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#ff2301" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorMeetings" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4B5563" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#4B5563" stopOpacity={0}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 10 }} 
            dy={10}
            tickFormatter={(str) => {
              const date = new Date(str);
              return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
            }}
          />
          
          <YAxis 
            yAxisId="left"
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            dx={-10}
            tickFormatter={(val) => `฿${(val / 1000000).toFixed(1)}M`}
          />
          
          <YAxis 
            yAxisId="right"
            orientation="right"
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            dx={10}
          />
          
          <RechartsTooltip 
            contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
            labelStyle={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '12px' }}
            itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
            formatter={(value: any, name: any, props: any) => {
              if (name === 'ยอดขายสะสม') return [`฿${value.toLocaleString()}`, name];
              if (name === 'ยอดพรีเมียมรายวัน') {
                const hit = props.payload?.hitTarget;
                const suffix = hasDailyTarget 
                  ? (hit ? ' ✅ ถึงเป้า' : ' ⚠️ ไม่ถึงเป้า') 
                  : '';
                return [`฿${value.toLocaleString()}${suffix}`, name];
              }
              if (name === 'เป้ารายวัน') return [`฿${value.toLocaleString()}`, name];
              return [value, name];
            }}
          />

          {/* Daily target reference line */}
          {hasDailyTarget && (
            <ReferenceLine
              yAxisId="left"
              y={dailyTarget}
              stroke="#D4AF37"
              strokeDasharray="6 3"
              strokeWidth={2}
              label={{
                value: `เป้า/วัน ฿${Math.round(dailyTarget).toLocaleString()}`,
                fill: '#D4AF37',
                fontSize: 10,
                fontWeight: 'bold',
                position: 'insideTopRight',
              }}
            />
          )}

          {/* Daily sales bars */}
          <Bar
            yAxisId="left"
            dataKey="sales"
            name="ยอดพรีเมียมรายวัน"
            barSize={data.length > 30 ? 4 : 12}
            radius={[4, 4, 0, 0]}
          >
            {data.map((entry: any, index: number) => {
              const color = hasDailyTarget 
                ? (entry.hitTarget ? '#22c55e' : '#ff2301') 
                : '#ff2301'; // Default to theme red if no target
              return (
                <RechartsCell
                  key={`bar-${index}`}
                  fill={color}
                  fillOpacity={0.6}
                />
              );
            })}
          </Bar>

          {/* Cumulative target dashed line */}
          {hasDailyTarget && (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="cumulativeTarget"
              name="เป้ารายวัน"
              stroke="#D4AF37"
              strokeWidth={1.5}
              strokeDasharray="6 3"
              dot={false}
              legendType="none"
            />
          )}
          
          {visibleSeries.cumulativeSales && (
            <Area 
              yAxisId="left"
              type="monotone" 
              dataKey="cumulativeSales" 
              name="ยอดขายสะสม"
              stroke="#ff2301" 
              strokeWidth={3} 
              fillOpacity={1} 
              fill="url(#colorSales)"
              dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              animationDuration={1500}
              animationEasing="ease-in-out"
            />
          )}
          
          {visibleSeries.calls && (
            <Area 
              yAxisId="right"
              type="monotone" 
              dataKey="calls" 
              name="โทร"
              stroke="#D4AF37" 
              strokeWidth={2} 
              fillOpacity={1} 
              fill="url(#colorCalls)"
              animationDuration={1500}
              animationEasing="ease-in-out"
            />
          )}
          
          {visibleSeries.meetings && (
            <Area 
              yAxisId="right"
              type="monotone" 
              dataKey="meetings" 
              name="เข้าพบ"
              stroke="#4B5563" 
              strokeWidth={2} 
              fillOpacity={1} 
              fill="url(#colorMeetings)"
            />
          )}
          
          {visibleSeries.quotes && (
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="quotes" 
              name="ใบเสนอราคา"
              stroke="#1F2937" 
              strokeWidth={2} 
              dot={false}
            />
          )}

          {/* MoM Overlay: Previous Period Cumulative Sales */}
          {showMoMOverlay && (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="prevCumulativeSales"
              name="ยอดสะสมรอบก่อน"
              stroke="#94a3b8"
              strokeWidth={2}
              strokeDasharray="8 4"
              dot={false}
              legendType="line"
            />
          )}
          {showMoMOverlay && (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="prevCumulativeTarget"
              name="เป้ารอบก่อน"
              stroke="#cbd5e1"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              legendType="none"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

const PREMIUM_COLORS = ['#ff2301', '#D4AF37', '#4B5563', '#1F2937', '#9ca3af', '#e5e7eb', '#7f1d1d', '#facc15'];

export function ProductMixPieChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 w-full flex items-center justify-center text-gray-400 font-bold text-xs uppercase tracking-widest bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
        ไม่พบข้อมูลผลิตภัณฑ์
      </div>
    );
  }
  
  const chartData = data.map((item, index) => ({
    name: item.name || 'อื่นๆ',
    value: item.value || 0,
    color: PREMIUM_COLORS[index % PREMIUM_COLORS.length]
  })).filter(d => d.value > 0);

  const total = chartData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="h-72 w-full flex flex-col items-center justify-center relative">
      <ResponsiveContainer width="100%" height="80%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <RechartsTooltip 
            formatter={(value: any) => [`฿${value.toLocaleString()}`, 'ยอดขาย']}
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
          />
        </PieChart>
      </ResponsiveContainer>
      
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 px-4 w-full overflow-y-auto max-h-20 custom-scrollbar">
        {chartData.map((item: any) => (
          <div key={item.name} className="flex items-center gap-1.5 min-w-0">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-[10px] font-bold text-gray-500 truncate">{item.name}</span>
            <span className="text-[10px] font-black text-gray-900 ml-auto">{((item.value / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PipelineFunnelChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
      >
        <XAxis type="number" hide />
        <YAxis 
          type="category" 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: '#475569', fontSize: 10, fontWeight: 'bold' }} 
        />
        <RechartsTooltip 
          cursor={{ fill: 'transparent' }}
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
        />
        <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={25}>
          {data.map((entry, index) => (
            <RechartsCell key={`cell-${index}`} fill={PREMIUM_COLORS[index % PREMIUM_COLORS.length]} opacity={0.8 - (index * 0.15)} />
          ))}
          <LabelList dataKey="value" position="right" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#1e293b' }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LostReasonPieChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-gray-400 text-xs">ไม่มีข้อมูลสาเหตุที่พลาด</div>;
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius="40%"
          outerRadius="70%"
          paddingAngle={4}
          dataKey="value"
          stroke="none"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={PREMIUM_COLORS[(index + 3) % PREMIUM_COLORS.length]} />
          ))}
        </Pie>
        <RechartsTooltip 
          formatter={(val: any) => [val, 'จำนวนดีล']}
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
        />
        <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '8px', fontWeight: 'bold', paddingTop: '10px' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function RegionalBarChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
      >
        <XAxis type="number" hide />
        <YAxis 
          type="category" 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: '#475569', fontSize: 9, fontWeight: 'bold' }} 
          width={70}
        />
        <RechartsTooltip 
          formatter={(val: any) => [`฿${(val/1000).toFixed(0)}k`, 'ยอดขาย']}
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
        />
        <Bar dataKey="value" fill="#4B5563" radius={[0, 4, 4, 0]} barSize={12}>
          {data.map((entry, index) => (
            <RechartsCell key={`cell-${index}`} fill={index === 0 ? '#ff2301' : '#4B5563'} opacity={0.7} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function GrowthComparisonChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
        <YAxis hide />
        <RechartsTooltip 
          formatter={(val: any) => [`฿${(val/1000000).toFixed(2)}M`, '']}
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
        />
        <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
        <Bar dataKey="previous" name="รอบก่อน" fill="#e5e7eb" radius={[4, 4, 0, 0]} barSize={30} />
        <Bar dataKey="actual" name="ปัจจุบัน" fill="#ff2301" radius={[4, 4, 0, 0]} barSize={30} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AnalyticalDonutChart({ data, label }: { data: any[], label?: string }) {
  if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-gray-400 text-[10px]">ไม่มีข้อมูล</div>;
  
  const total = data.reduce((acc, curr) => acc + curr.value, 0);
  
  return (
    <div className="h-full w-full flex flex-col relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="85%"
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={PREMIUM_COLORS[index % PREMIUM_COLORS.length]} />
            ))}
          </Pie>
          <RechartsTooltip 
            formatter={(val: any) => [val.toLocaleString(), 'จำนวนดีล']}
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">รวม</span>
        <span className="text-sm font-black text-gray-900 leading-none">{total.toLocaleString()}</span>
        <span className="text-[8px] font-bold text-gray-400 uppercase mt-0.5">{label || 'ดีล'}</span>
      </div>
    </div>
  );
}

export function WinRateBarChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: '#94a3b8', fontSize: 8 }}
          interval={0}
          angle={-15}
          textAnchor="end"
        />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 8 }} domain={[0, 100]} />
        <RechartsTooltip 
          formatter={(val: any) => [`${val.toFixed(1)}%`, 'Win Rate']}
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
        />
        <Bar dataKey="winRate" fill="#ff2301" radius={[4, 4, 0, 0]} barSize={20}>
          {data.map((entry, index) => (
            <RechartsCell key={`cell-${index}`} fill={PREMIUM_COLORS[index % PREMIUM_COLORS.length]} opacity={0.8} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ClosingTimeChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9 }} />
        <RechartsTooltip 
          formatter={(val: any) => [val, 'จำนวนดีล']}
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
        />
        <Bar dataKey="value" fill="#8b0000" radius={[4, 4, 0, 0]} barSize={35} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DecisionMakerChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <XAxis type="number" hide />
        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 'bold' }} width={80} />
        <RechartsTooltip 
          cursor={{ fill: 'transparent' }}
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
        />
        <Bar dataKey="value" fill="#ff2301" radius={[0, 4, 4, 0]} barSize={12} opacity={0.6}>
          {data.map((entry, index) => (
            <RechartsCell key={`cell-${index}`} fill={PREMIUM_COLORS[index % PREMIUM_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ProductPerformanceChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-gray-400 text-xs">ไม่มีข้อมูลผลิตภัณฑ์</div>;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(val) => `฿${(val / 1000).toFixed(0)}k`} />
        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
        <RechartsTooltip 
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
          formatter={(value: any, name: any) => {
            if (name === 'มูลค่าการขาย') return [`฿${value.toLocaleString()}`, name];
            return [value, name];
          }}
        />
        <Bar yAxisId="left" dataKey="value" name="มูลค่าการขาย" fill="#ff2301" radius={[4, 4, 0, 0]} barSize={30} opacity={0.8} />
        <Line yAxisId="right" type="monotone" dataKey="volume" name="จำนวน (ดีล)" stroke="#D4AF37" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function HorizontalLeaderboardChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-gray-400 text-xs">ไม่มีข้อมูลพนักงาน</div>;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
      >
        <XAxis type="number" hide />
        <YAxis 
          type="category" 
          dataKey="fullName" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: '#475569', fontSize: 10, fontWeight: 'bold' }} 
          width={90}
        />
        <RechartsTooltip 
          formatter={(val: any) => [`฿${(val/1000000).toFixed(2)}M`, 'ยอดขาย']}
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
        />
        <Bar dataKey="won" name="ยอดขาย" radius={[0, 10, 10, 0]} barSize={20}>
          {data.map((entry, index) => (
            <RechartsCell key={`cell-${index}`} fill={index === 0 ? '#ff2301' : '#4B5563'} opacity={0.8 - (index * 0.1)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// -------------------------------------------------------------
// NEW: ComposedActivityCorrelationChart (Weekly Activity vs Won Value)
// -------------------------------------------------------------
export function ComposedActivityCorrelationChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 w-full flex items-center justify-center text-gray-400 font-bold text-xs uppercase bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
        ไม่มีข้อมูลพนักงานเพื่อคำนวณความสัมพันธ์
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="fullName" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} 
            dy={10}
          />
          <YAxis 
            yAxisId="left"
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748b', fontSize: 10 }}
            tickFormatter={(val) => `฿${(val / 1000).toFixed(0)}k`}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748b', fontSize: 10 }}
            label={{ value: 'กิจกรรมเฉลี่ย/สัปดาห์', angle: 90, position: 'insideRight', style: { fill: '#64748b', fontSize: 9, fontWeight: 'bold' } }}
          />
          <RechartsTooltip 
            contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)', padding: '12px', background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)' }}
            labelStyle={{ fontWeight: 'bold', fontSize: '11px', color: '#1e293b', marginBottom: '6px' }}
            itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
            formatter={(value: any, name: any) => {
              if (name === 'ยอดขายที่ปิดได้') return [`฿${value.toLocaleString()}`, name];
              return [`${Number(value).toFixed(1)} ครั้ง/สัปดาห์`, name];
            }}
          />
          <Legend 
            verticalAlign="top" 
            align="center" 
            iconType="circle" 
            wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '15px' }}
          />
          
          {/* Won Sales Bar */}
          <Bar 
            yAxisId="left" 
            dataKey="won" 
            name="ยอดขายที่ปิดได้" 
            fill="#ff2301" 
            radius={[6, 6, 0, 0]} 
            barSize={24} 
            opacity={0.8}
          />
          
          {/* Average Calls Line */}
          <Line 
            yAxisId="right" 
            type="monotone" 
            dataKey="weeklyCalls" 
            name="โทรเฉลี่ย/สัปดาห์" 
            stroke="#D4AF37" 
            strokeWidth={3} 
            dot={{ r: 5, strokeWidth: 2, fill: '#fff', stroke: '#D4AF37' }}
            activeDot={{ r: 7 }}
          />
          
          {/* Average Meetings Line */}
          <Line 
            yAxisId="right" 
            type="monotone" 
            dataKey="weeklyMeetings" 
            name="พบเฉลี่ย/สัปดาห์" 
            stroke="#475569" 
            strokeWidth={3} 
            dot={{ r: 5, strokeWidth: 2, fill: '#fff', stroke: '#475569' }}
            activeDot={{ r: 7 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// -------------------------------------------------------------
// NEW: PipelineComposedStageChart (Pipeline Counts, Values and Weighted)
// -------------------------------------------------------------
export function PipelineComposedStageChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 w-full flex items-center justify-center text-gray-400 font-bold text-xs uppercase bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
        ไม่มีข้อมูลขั้นตอนท่อดีล
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 20, right: 10, left: 10, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} 
            dy={8}
          />
          <YAxis 
            yAxisId="left"
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748b', fontSize: 10 }}
            label={{ value: 'จำนวนดีล (รายการ)', angle: -90, position: 'insideLeft', style: { fill: '#64748b', fontSize: 9, fontWeight: 'bold' } }}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748b', fontSize: 10 }}
            tickFormatter={(val) => `฿${(val / 1000).toFixed(0)}k`}
            label={{ value: 'มูลค่า (บาท)', angle: 90, position: 'insideRight', style: { fill: '#64748b', fontSize: 9, fontWeight: 'bold' } }}
          />
          <RechartsTooltip 
            contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)', padding: '12px', background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)' }}
            labelStyle={{ fontWeight: 'bold', fontSize: '11px', color: '#1e293b', marginBottom: '6px' }}
            itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
            formatter={(value: any, name: any) => {
              if (name === 'จำนวนดีล') return [`${value} รายการ`, name];
              return [`฿${value.toLocaleString()}`, name];
            }}
          />
          <Legend 
            verticalAlign="top" 
            align="center" 
            iconType="circle" 
            wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '15px' }}
          />
          
          {/* Stage Count Bar */}
          <Bar 
            yAxisId="left" 
            dataKey="count" 
            name="จำนวนดีล" 
            fill="#475569" 
            radius={[4, 4, 0, 0]} 
            barSize={16} 
            opacity={0.7}
          />
          
          {/* Total Value Bar */}
          <Bar 
            yAxisId="right" 
            dataKey="value" 
            name="มูลค่ารวมใบเสนอราคา" 
            fill="#ff2301" 
            radius={[4, 4, 0, 0]} 
            barSize={16} 
            opacity={0.8}
          />
          
          {/* Weighted Pipeline Value Line */}
          <Line 
            yAxisId="right" 
            type="monotone" 
            dataKey="weighted" 
            name="มูลค่าถ่วงน้ำหนักตามโอกาส" 
            stroke="#D4AF37" 
            strokeWidth={3} 
            dot={{ r: 5, strokeWidth: 2, fill: '#fff', stroke: '#D4AF37' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// -------------------------------------------------------------
// NEW: ProductPerformanceComposedChart
// -------------------------------------------------------------
export function ProductPerformanceComposedChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 w-full flex items-center justify-center text-gray-400 font-bold text-xs bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
        ไม่มีข้อมูลผลิตภัณฑ์
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 20, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#475569', fontSize: 10, fontWeight: 'bold' }} 
          />
          <YAxis 
            yAxisId="left"
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#475569', fontSize: 10 }}
            tickFormatter={(val) => `฿${(val / 1000).toFixed(0)}k`}
            label={{ value: 'มูลค่า (บาท)', angle: -90, position: 'insideLeft', style: { fill: '#475569', fontSize: 9, fontWeight: 'bold' } }}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#475569', fontSize: 10 }}
            tickFormatter={(val) => `${val}%`}
            domain={[0, 100]}
            label={{ value: 'อัตรากำไรขั้นต้น (%)', angle: 90, position: 'insideRight', style: { fill: '#475569', fontSize: 9, fontWeight: 'bold' } }}
          />
          <RechartsTooltip 
            formatter={(value: any, name: any) => {
              if (name === 'อัตรากำไรขั้นต้น') return [`${value.toFixed(1)}% (ประมาณการ)`, name];
              return [`฿${value.toLocaleString()}`, name];
            }}
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
          />
          <Legend verticalAlign="top" align="center" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '10px' }} />
          
          <Bar yAxisId="left" dataKey="value" name="ยอดขายรวม" fill="#ff2301" radius={[4, 4, 0, 0]} barSize={24} />
          <Bar yAxisId="left" dataKey="grossProfit" name="กำไรขั้นต้น (ประมาณการ)" fill="#D4AF37" radius={[4, 4, 0, 0]} barSize={24} />
          <Line yAxisId="right" type="monotone" dataKey="marginPct" name="อัตรากำไรขั้นต้น" stroke="#10b981" strokeWidth={3} dot={{ r: 5, strokeWidth: 2, fill: '#fff', stroke: '#10b981' }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// -------------------------------------------------------------
// NEW: RegionalComposedChart (Sales Performance vs Penetration)
// -------------------------------------------------------------
export function RegionalComposedChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-gray-400 text-xs">ไม่มีข้อมูลภูมิภาค</div>;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={data}
        margin={{ top: 20, right: 20, left: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: '#475569', fontSize: 10, fontWeight: 'bold' }} 
        />
        <YAxis 
          yAxisId="left"
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: '#475569', fontSize: 10 }}
          tickFormatter={(val) => `฿${(val/1000).toFixed(0)}k`}
          label={{ value: 'ยอดขายรวม (บาท)', angle: -90, position: 'insideLeft', style: { fill: '#475569', fontSize: 9, fontWeight: 'bold' } }}
        />
        <YAxis 
          yAxisId="right"
          orientation="right"
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: '#475569', fontSize: 10 }}
          tickFormatter={(val) => `${val.toFixed(0)}%`}
          domain={[0, 100]}
          label={{ value: 'อัตราการเข้าถึงตลาด (%)', angle: 90, position: 'insideRight', style: { fill: '#475569', fontSize: 9, fontWeight: 'bold' } }}
        />
        <RechartsTooltip 
          formatter={(value: any, name: any) => {
            if (name === 'การเข้าถึงตลาด') return [`${value.toFixed(1)}%`, name];
            if (name === 'ยอดขายเฉลี่ยต่อลูกค้า') return [`฿${Math.round(value).toLocaleString()}`, name];
            return [`฿${value.toLocaleString()}`, name];
          }}
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
        />
        <Legend verticalAlign="top" align="center" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '10px' }} />
        
        <Bar yAxisId="left" dataKey="value" name="ยอดขายรวม" fill="#ff2301" radius={[4, 4, 0, 0]} barSize={24} />
        <Line yAxisId="right" type="monotone" dataKey="penetrationRate" name="การเข้าถึงตลาด" stroke="#D4AF37" strokeWidth={3} dot={{ r: 5, strokeWidth: 2, fill: '#fff', stroke: '#D4AF37' }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// -------------------------------------------------------------
// NEW: LostReasonSummaryChart
// -------------------------------------------------------------
export function LostReasonSummaryChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-gray-400 text-xs">ไม่มีข้อมูลสาเหตุการพลาดดีล</div>;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        layout="vertical"
        data={data.slice(0, 5)}
        margin={{ top: 10, right: 30, left: 40, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
        <XAxis type="number" xAxisId="left" hide />
        <XAxis type="number" xAxisId="right" hide />
        <YAxis 
          type="category" 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: '#475569', fontSize: 10, fontWeight: 'bold' }} 
          width={150}
        />
        <RechartsTooltip 
          formatter={(value: any, name: any) => {
            if (name === 'มูลค่าสูญเสีย') return [`฿${value.toLocaleString()}`, name];
            return [`${value} ดีล`, name];
          }}
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
        />
        <Legend verticalAlign="top" align="center" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '10px' }} />
        
        <Bar xAxisId="left" dataKey="value" name="จำนวนดีล (ครั้ง)" fill="#ff2301" radius={[0, 4, 4, 0]} barSize={10} opacity={0.8} />
        <Bar xAxisId="right" dataKey="lostValue" name="มูลค่าสูญเสีย (บาท)" fill="#4b5563" radius={[0, 4, 4, 0]} barSize={10} opacity={0.6} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// -------------------------------------------------------------
// NEW: LostReasonByProductChart
// -------------------------------------------------------------
export function LostReasonByProductChart({ data }: { data: any }) {
  if (!data || Object.keys(data).length === 0) return <div className="h-full flex items-center justify-center text-gray-400 text-xs">ไม่มีข้อมูลสาเหตุการพลาดดีล</div>;

  const chartData = Object.entries(data).map(([productType, categories]: any) => {
    return {
      name: productType,
      ...categories
    };
  });

  const categories = Array.from(new Set(
    Object.values(data).flatMap((categories: any) => Object.keys(categories))
  ));

  const colors = ['#ff2301', '#D4AF37', '#4b5563', '#1e293b', '#94a3b8', '#f59e0b', '#10b981'];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: '#475569', fontSize: 10, fontWeight: 'bold' }} 
        />
        <YAxis 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: '#475569', fontSize: 10 }}
        />
        <RechartsTooltip 
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
        />
        <Legend verticalAlign="top" align="center" iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', paddingBottom: '10px' }} />
        {categories.map((cat: any, idx: number) => (
          <Bar 
            key={cat} 
            dataKey={cat} 
            name={cat} 
            stackId="a" 
            fill={colors[idx % colors.length]} 
            barSize={30}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// -------------------------------------------------------------
// NEW: ForecastAccuracyChart (Group 3)
// -------------------------------------------------------------
export function ForecastAccuracyChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-gray-400 text-xs">ไม่มีข้อมูลเป้าหมายรายเดือน</div>;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={data}
        margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis 
          dataKey="month" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: '#475569', fontSize: 10, fontWeight: 'bold' }}
          tickFormatter={(val) => {
            const parts = val.split('-');
            const monthNames = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
            return monthNames[parseInt(parts[1]) - 1] || val;
          }}
        />
        <YAxis 
          yAxisId="left"
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: '#94a3b8', fontSize: 10 }}
          tickFormatter={(val) => `฿${(val / 1000000).toFixed(1)}M`}
        />
        <YAxis 
          yAxisId="right"
          orientation="right"
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: '#22c55e', fontSize: 10 }}
          domain={[0, 100]}
          tickFormatter={(val) => `${val}%`}
        />
        <RechartsTooltip 
          contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
          formatter={(value: any, name: any) => {
            if (name === 'ความแม่นยำ') return [`${value}%`, name];
            return [`฿${Math.round(value).toLocaleString()}`, name];
          }}
        />
        <Legend verticalAlign="top" align="center" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '10px' }} />
        
        <Bar yAxisId="left" dataKey="forecast" name="เป้าหมาย (Forecast)" fill="#D4AF37" radius={[4, 4, 0, 0]} barSize={20} opacity={0.7} />
        <Bar yAxisId="left" dataKey="actual" name="ยอดขายจริง (Actual)" fill="#ff2301" radius={[4, 4, 0, 0]} barSize={20} opacity={0.8} />
        <Line yAxisId="right" type="monotone" dataKey="accuracy" name="ความแม่นยำ" stroke="#22c55e" strokeWidth={3} dot={{ r: 5, strokeWidth: 2, fill: '#fff', stroke: '#22c55e' }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
