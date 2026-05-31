import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from 'recharts';
import { Segmented } from './ui';
import { useState } from 'react';

const tooltipStyle = { background: '#1a1a28', border: '1px solid #23233a', borderRadius: 10, fontSize: 12 };

function ChartCard({ title, children, full }) {
  return (
    <div className={`card p-5 ${full ? 'lg:col-span-2' : ''}`}>
      <div className="text-[11px] uppercase tracking-wider text-muted font-bold mb-4">{title}</div>
      {children}
    </div>
  );
}

export default function Reports({ data }) {
  const [range, setRange] = useState('daily');
  const series = data[range] || [];

  const pie = [
    { name: 'Approved', value: data.totals.approved, color: '#10b981' },
    { name: 'Pending', value: data.totals.pending, color: '#f59e0b' },
    { name: 'Rejected', value: data.totals.rejected, color: '#ef4444' },
  ];
  const topItems = data.topItems.map((t) => ({
    name: t.name.length > 22 ? t.name.slice(0, 22) + '…' : t.name,
    qty: t.qty,
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl sm:text-3xl font-extrabold">Reports &amp; Analytics</h1>
        <Segmented options={['daily', 'weekly', 'monthly']} value={range} onChange={setRange} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <ChartCard title={range === 'monthly' ? '30-day volume' : `${range} breakdown by status`}>
          <ResponsiveContainer width="100%" height={240}>
            {range === 'monthly' ? (
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#23233a" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#7a7a95', fontSize: 11 }} interval={4} />
                <YAxis tick={{ fill: '#7a7a95', fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2.5} dot={false} />
              </LineChart>
            ) : (
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#23233a" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#7a7a95', fontSize: 11 }} />
                <YAxis tick={{ fill: '#7a7a95', fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
                <Bar dataKey="approved" stackId="a" fill="#10b981" />
                <Bar dataKey="pending" stackId="a" fill="#f59e0b" />
                <Bar dataKey="rejected" stackId="a" fill="#ef4444" radius={[5, 5, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Status distribution">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pie} cx="50%" cy="50%" innerRadius={58} outerRadius={92} paddingAngle={3} dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}
                stroke="none">
                {pie.map((e) => <Cell key={e.name} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top requested items (by quantity)" full>
          <ResponsiveContainer width="100%" height={Math.max(220, topItems.length * 30)}>
            <BarChart data={topItems} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#23233a" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#7a7a95', fontSize: 11 }} allowDecimals={false} />
              <YAxis dataKey="name" type="category" width={180} tick={{ fill: '#9a9ab5', fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
              <Bar dataKey="qty" fill="#6366f1" radius={[0, 5, 5, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
