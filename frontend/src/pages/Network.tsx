import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card'
import { Spinner } from '../components/Spinner'
import { http } from '../lib/http'

interface ChannelInfo {
  name: string
  height: number
  transactions: number
}

interface ChaincodeInfo {
  name: string
  version: string
  channel: string
  status: string
}

interface InfrastructureStatus {
  ca: { name: string; status: string; url: string }
  peers: Array<{ name: string; status: string; endpoint: string }>
  orderers: Array<{ name: string; status: string; endpoint: string }>
}

export default function NetworkPage() {
  const [tab, setTab] = useState<'channels' | 'chaincodes' | 'infrastructure'>('channels')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Channels data
  const [channels] = useState<ChannelInfo[]>([
    { name: 'testchan', height: 0, transactions: 0 },
  ])

  // Chaincodes data  
  const [chaincodes] = useState<ChaincodeInfo[]>([
    { name: 'teatrace', version: '1.0', channel: 'testchan', status: 'active' },
    { name: 'network-core', version: '1.0', channel: 'testchan', status: 'active' },
  ])

  // Infrastructure data
  const [infrastructure] = useState<InfrastructureStatus>({
    ca: {
      name: 'ca.ibn.ictu.edu.vn',
      status: 'running',
      url: 'https://localhost:37054',
    },
    peers: [
      { name: 'peer0.ibn.ictu.edu.vn', status: 'running', endpoint: 'localhost:37051' },
      { name: 'peer1.ibn.ictu.edu.vn', status: 'running', endpoint: 'localhost:38051' },
      { name: 'peer2.ibn.ictu.edu.vn', status: 'running', endpoint: 'localhost:39051' },
    ],
    orderers: [
      { name: 'orderer.ictu.edu.vn', status: 'running', endpoint: 'localhost:37050' },
    ],
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Network</h1>
        <p className="mt-1 text-sm text-gray-600">
          Quản lý và giám sát hạ tầng blockchain
        </p>
      </div>

      <div className="border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setTab('channels')}
            className={`px-4 py-2 font-medium ${tab === 'channels' ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-600'
              }`}
          >
            📡 Channels
          </button>
          <button
            onClick={() => setTab('chaincodes')}
            className={`px-4 py-2 font-medium ${tab === 'chaincodes' ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-600'
              }`}
          >
            ⛓️ Chaincodes
          </button>
          <button
            onClick={() => setTab('infrastructure')}
            className={`px-4 py-2 font-medium ${tab === 'infrastructure' ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-600'
              }`}
          >
            🏗️ Infrastructure
          </button>
        </div>
      </div>

      {tab === 'channels' && (
        <Card>
          <CardHeader>
            <CardTitle>Channels</CardTitle>
            <CardDescription>Danh sách các channels trong network</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Spinner size={16} /> Đang tải...
              </div>
            ) : error ? (
              <div className="rounded bg-red-50 p-3 text-sm text-red-600">{error}</div>
            ) : (
              <div className="overflow-hidden rounded border">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Channel Name</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Block Height</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Transactions</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {channels.map((channel) => (
                      <tr key={channel.name}>
                        <td className="px-4 py-2 font-medium text-gray-800">{channel.name}</td>
                        <td className="px-4 py-2 text-gray-600">{channel.height}</td>
                        <td className="px-4 py-2 text-gray-600">{channel.transactions}</td>
                        <td className="px-4 py-2">
                          <span className="inline-block rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                            ✅ Active
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {channels.length === 0 && (
                  <p className="px-4 py-3 text-sm text-gray-500">Chưa có channels.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'chaincodes' && (
        <Card>
          <CardHeader>
            <CardTitle>Chaincodes</CardTitle>
            <CardDescription>Danh sách chaincodes đã deploy</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded border">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Chaincode Name</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Version</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Channel</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {chaincodes.map((cc) => (
                    <tr key={`${cc.name}-${cc.channel}`}>
                      <td className="px-4 py-2 font-medium text-gray-800">{cc.name}</td>
                      <td className="px-4 py-2 text-gray-600">{cc.version}</td>
                      <td className="px-4 py-2 text-gray-600">{cc.channel}</td>
                      <td className="px-4 py-2">
                        <span className="inline-block rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                          ✅ {cc.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'infrastructure' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Certificate Authority (CA)</CardTitle>
              <CardDescription>Fabric CA status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded border p-4">
                <div>
                  <div className="font-medium text-gray-800">{infrastructure.ca.name}</div>
                  <div className="text-sm text-gray-600">{infrastructure.ca.url}</div>
                </div>
                <span className="inline-block rounded bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                  ✅ {infrastructure.ca.status}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Peers</CardTitle>
              <CardDescription>Danh sách các peer nodes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {infrastructure.peers.map((peer) => (
                  <div key={peer.name} className="flex items-center justify-between rounded border p-3">
                    <div>
                      <div className="font-medium text-gray-800">{peer.name}</div>
                      <div className="text-sm text-gray-600">{peer.endpoint}</div>
                    </div>
                    <span className="inline-block rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                      ✅ {peer.status}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Orderers</CardTitle>
              <CardDescription>Danh sách các orderer nodes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {infrastructure.orderers.map((orderer) => (
                  <div key={orderer.name} className="flex items-center justify-between rounded border p-3">
                    <div>
                      <div className="font-medium text-gray-800">{orderer.name}</div>
                      <div className="text-sm text-gray-600">{orderer.endpoint}</div>
                    </div>
                    <span className="inline-block rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                      ✅ {orderer.status}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
