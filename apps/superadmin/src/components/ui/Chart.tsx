import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

interface ChartProps {
  data: Array<{
    date: string;
    created: number;
    delivered: number;
  }>;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 p-3 rounded-xl shadow-lg text-xs space-y-1">
        <p className="font-medium text-gray-900 mb-1">{label}</p>
        <div className="flex items-center gap-2 text-blue-600">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span>Creados: {payload[0]?.value ?? 0}</span>
        </div>
        <div className="flex items-center gap-2 text-brand-700">
          <span className="w-2 h-2 rounded-full bg-brand-500" />
          <span>Entregados: {payload[1]?.value ?? 0}</span>
        </div>
      </div>
    );
  }
  return null;
};

export const OrdersChart = ({ data }: ChartProps) => {
  const formattedData = data.map((item) => {
    // Convert YYYY-MM-DD to DD/MM
    const parts = item.date.split('-');
    const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : item.date;
    return {
      ...item,
      displayDate: label,
    };
  });

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={formattedData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F5F5F5" />
          <XAxis
            dataKey="displayDate"
            stroke="#ADADAD"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#ADADAD"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
          />
          <Line
            type="monotone"
            name="Creados"
            dataKey="created"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          <Line
            type="monotone"
            name="Entregados"
            dataKey="delivered"
            stroke="#22C55E"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
