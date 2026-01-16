import { useAuthStore } from '@/store/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Users, Database, Activity, Server } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { useQuery } from '@tanstack/react-query';
import { UserService } from '@/services/userService';
import { ChannelService } from '@/services/channelService';
import { ExplorerService } from '@/services/explorerService';
import { useNavigate } from 'react-router-dom';

type SparklineChartProps = {
  data: number[];
  color?: string;
  height?: number;
};

const SparklineChart = ({ data, color = '#6366f1', height = 60 }: SparklineChartProps) => {
  if (!data || data.length === 0) {
    return <div className="text-sm text-gray-400">Not enough data</div>;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const verticalPadding = 5;
  const horizontalPadding = 2;

  const points = data.map((value, index) => {
    const x =
      data.length === 1
        ? 50
        : (index / (data.length - 1)) * (100 - horizontalPadding * 2) + horizontalPadding;
    const normalized = max === min ? 0.5 : (value - min) / (max - min);
    const y = (1 - normalized) * (height - verticalPadding * 2) + verticalPadding;
    return `${x},${y}`;
  });

  return (
    <svg
      className="w-full h-20"
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points.join(' ')}
      />
    </svg>
  );
};

const DashboardPage = () => {
  const { user } = useAuthStore();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();

  // Fetch real data
  const { data: usersData } = useQuery({
    queryKey: ['dashboard-users'],
    queryFn: () => UserService.getUsers(0, 1),
    enabled: hasPermission('users', 'read'),
  });

  const { data: channelsData } = useQuery({
    queryKey: ['dashboard-channels'],
    queryFn: () => ChannelService.getChannels(1, 100),
    enabled: hasPermission('channels', 'read'),
  });

  const { data: healthData } = useQuery({
    queryKey: ['dashboard-health'],
    queryFn: () => ExplorerService.getHealth(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Get blockchain height from first channel
  const firstChannel = channelsData?.channels?.[0];
  const { data: blocksData } = useQuery({
    queryKey: ['dashboard-blocks', firstChannel?.id],
    queryFn: () => ExplorerService.getBlocks(firstChannel?.id || '', 0, 1),
    enabled: !!firstChannel?.id && hasPermission('blocks', 'read'),
  });

  // Get more blocks for chart (last 10 blocks)
  const { data: blocksChartData, isLoading: isLoadingBlocksChart } = useQuery({
    queryKey: ['dashboard-blocks-chart', firstChannel?.id],
    queryFn: () => ExplorerService.getBlocks(firstChannel?.id || '', 0, 10),
    enabled: !!firstChannel?.id && hasPermission('blocks', 'read'),
  });

  // Calculate transactions per block from blocks data
  const blocksArray = blocksChartData?.blocks || [];

  const transactionsPerBlock = blocksArray.length > 0
    ? blocksArray
      .slice()
      .reverse()
      .map(block => block.tx_count || 0)
    : [];

  const currentTxPerBlock = transactionsPerBlock.length > 0
    ? transactionsPerBlock[transactionsPerBlock.length - 1]
    : 0;

  const avgTxPerBlock = transactionsPerBlock.length > 0
    ? Math.round(transactionsPerBlock.reduce((a, b) => a + b, 0) / transactionsPerBlock.length)
    : 0;

  // Block height trend data
  const blockHeightTrend = blocksArray.length > 0
    ? blocksArray
      .slice()
      .reverse()
      .map(block => block.block_number || 0)
    : [];

  const blockHeightChange = blockHeightTrend.length > 0
    ? blockHeightTrend[blockHeightTrend.length - 1] - (blockHeightTrend[0] || 0)
    : 0;

  // Calculate stats
  const totalUsers = usersData?.total || 0;
  const activeChannels = channelsData?.channels?.filter(c => c.status === 'active').length || 0;
  const channelNames = channelsData?.channels?.filter(c => c.status === 'active').map(c => c.name).join(', ') || 'No active channels';
  const networkStatus = healthData?.status === 'healthy' ? 'Healthy' : 'Unhealthy';
  const networkDetails = healthData?.status === 'healthy' ? 'All services running' : 'Some services unavailable';
  const blockchainHeight = blocksData?.blocks?.[0]?.block_number || 0;

  const stats = [
    {
      name: 'Total Users',
      value: String(totalUsers),
      icon: Users,
      change: totalUsers > 0 ? `${totalUsers} registered users` : 'No users yet',
      changeType: 'neutral' as const,
    },
    {
      name: 'Active Channels',
      value: String(activeChannels),
      icon: Database,
      change: channelNames,
      changeType: 'neutral' as const,
    },
    {
      name: 'Network Status',
      value: networkStatus,
      icon: Activity,
      change: networkDetails,
      changeType: networkStatus === 'Healthy' ? 'increase' as const : 'decrease' as const,
    },
    {
      name: 'Blockchain Height',
      value: String(blockchainHeight),
      icon: Server,
      change: blockchainHeight > 0 ? `Latest block: #${blockchainHeight}` : 'No blocks yet',
      changeType: 'neutral' as const,
    },
  ];

  return (
    <div className="space-y-6 relative z-0">
      {/* Stats Cards - Permission-based */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 relative z-0">
        {stats.map((stat) => {
          // Check permission for each stat
          let hasAccess = true;
          if (stat.name === 'Total Users') {
            hasAccess = hasPermission('users', 'read');
          } else if (stat.name === 'Active Channels') {
            hasAccess = hasPermission('channels', 'read');
          } else if (stat.name === 'Network Status') {
            hasAccess = true; // Always accessible
          } else if (stat.name === 'Blockchain Height') {
            hasAccess = hasPermission('blocks', 'read');
          }

          if (!hasAccess) {
            return null; // Hide stat if no permission
          }

          const Icon = stat.icon;
          return (
            <Card key={stat.name} className="relative z-0">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Icon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {stat.name}
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stat.value}
                      </dd>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Network Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 relative z-0">
        <Card className="relative z-0">
          <CardHeader>
            <CardTitle>Network Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Transactions per block */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Transactions per block</p>
                    <p className="text-2xl font-bold text-gray-900">{currentTxPerBlock}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Avg {avgTxPerBlock} tx/block</p>
                  </div>
                </div>
                {isLoadingBlocksChart ? (
                  <div className="text-xs text-gray-400 text-center py-4">Loading data...</div>
                ) : transactionsPerBlock.length > 0 ? (
                  <div>
                    <SparklineChart
                      data={transactionsPerBlock}
                      color="#8b5cf6"
                      height={50}
                    />
                    <p className="text-xs text-gray-500 mt-2">Last {blocksArray.length} blocks</p>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 text-center py-4">
                    {firstChannel ? 'No block data available' : 'Select a channel to view data'}
                  </div>
                )}
              </div>

              {/* Block height trend */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Block height trend</p>
                    <p className="text-2xl font-bold text-gray-900">#{blockchainHeight}</p>
                  </div>
                  {blockHeightChange > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-green-600 font-medium">+{blockHeightChange} blocks</p>
                    </div>
                  )}
                </div>
                {isLoadingBlocksChart ? (
                  <div className="text-xs text-gray-400 text-center py-4">Loading data...</div>
                ) : blockHeightTrend.length > 0 ? (
                  <div>
                    <SparklineChart
                      data={blockHeightTrend}
                      color="#8b5cf6"
                      height={50}
                    />
                    <p className="text-xs text-gray-500 mt-2">Last {blocksArray.length} blocks</p>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 text-center py-4">
                    {firstChannel ? 'No block data available' : 'Select a channel to view data'}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>


        <Card className="relative z-0">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/chaincode?tab=query')}
                className="w-full text-left p-4 rounded-2xl border border-blue-100 bg-white/80 hover:bg-blue-50/40 transition-all shadow-sm hover:shadow-md"
              >
                <h4 className="font-medium text-gray-900">Query Chaincode</h4>
              </button>
              <button
                onClick={() => navigate('/chaincode?tab=invoke')}
                className="w-full text-left p-4 rounded-2xl border border-blue-100 bg-white/80 hover:bg-blue-50/40 transition-all shadow-sm hover:shadow-md"
              >
                <h4 className="font-medium text-gray-900">Invoke Chaincode</h4>
              </button>
              <button
                onClick={() => navigate('/explorer')}
                className="w-full text-left p-4 rounded-2xl border border-blue-100 bg-white/80 hover:bg-blue-50/40 transition-all shadow-sm hover:shadow-md"
              >
                <h4 className="font-medium text-gray-900">View Explorer</h4>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
