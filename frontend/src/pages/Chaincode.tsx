import { useState } from 'react'
import { queryChaincodeData, invokeChaincodeData } from '../lib/chaincode'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card'
import { Spinner } from '../components/Spinner'

interface Chaincode {
  id: string
  name: string
  channel: string
  version: string
  status: string
}

export default function ChaincodePage() {
  const [tab, setTab] = useState<'list' | 'query' | 'invoke'>('list')

  const chaincodes: Chaincode[] = [
    {
      id: '1',
      name: 'network-core',
      channel: 'testchan',
      version: '1.0.0',
      status: 'active',
    },
    {
      id: '2',
      name: 'network-core',
      channel: 'ibnchan',
      version: '1.0.0',
      status: 'active',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setTab('list')}
            className={`px-4 py-2 font-medium ${tab === 'list' ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-600'
              }`}
          >
            Danh sách
          </button>
          <button
            onClick={() => setTab('query')}
            className={`px-4 py-2 font-medium ${tab === 'query' ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-600'
              }`}
          >
            Query
          </button>
          <button
            onClick={() => setTab('invoke')}
            className={`px-4 py-2 font-medium ${tab === 'invoke' ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-600'
              }`}
          >
            Invoke
          </button>
        </div>
      </div>

      {tab === 'list' && <ChaincodeList chaincodes={chaincodes} />}
      {tab === 'query' && <QueryTab />}
      {tab === 'invoke' && <InvokeTab />}
    </div>
  )
}

function ChaincodeList({ chaincodes }: { chaincodes: Chaincode[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Smart Contracts (Chaincode)</CardTitle>
        <CardDescription>Quản lý và theo dõi chaincode</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex gap-2">
          <button className="rounded bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800">
            + Deploy Chaincode
          </button>
        </div>

        <div className="overflow-hidden rounded border">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Tên</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Kênh</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Phiên bản</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Trạng thái</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {chaincodes.map((cc: Chaincode) => (
                <tr key={cc.id}>
                  <td className="px-4 py-2 font-medium text-gray-800">{cc.name}</td>
                  <td className="px-4 py-2 text-gray-600">{cc.channel}</td>
                  <td className="px-4 py-2 text-gray-600">{cc.version}</td>
                  <td className="px-4 py-2">
                    <span className="inline-block rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                      {cc.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 space-x-2">
                    <button className="text-xs text-blue-600 hover:underline">Chi tiết</button>
                    <button className="text-xs text-red-600 hover:underline">Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function QueryTab() {
  const [channel, setChannel] = useState('testchan')
  const [chaincode, setChaincode] = useState('network-core')
  const [fcn, setFcn] = useState('GetNetworkConfig')
  const [args, setArgs] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>('')
  const [error, setError] = useState<string>('')

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult('')

    try {
      const res = await queryChaincodeData({
        channel,
        chaincode,
        fcn,
        args: args
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
      })

      if (res.success) {
        setResult(res.data ? JSON.stringify(res.data, null, 2) : 'Query successful')
      } else {
        setError(res.error || 'Query failed')
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Query Chaincode</CardTitle>
          <CardDescription>Gọi hàm read-only</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleQuery} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Channel</label>
              <input
                type="text"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full rounded border px-3 py-2 text-sm focus:border-gray-700 focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Chaincode</label>
              <input
                type="text"
                value={chaincode}
                onChange={(e) => setChaincode(e.target.value)}
                className="w-full rounded border px-3 py-2 text-sm focus:border-gray-700 focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Function</label>
              <input
                type="text"
                value={fcn}
                onChange={(e) => setFcn(e.target.value)}
                className="w-full rounded border px-3 py-2 text-sm focus:border-gray-700 focus:outline-none"
                placeholder="e.g., GetData"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Arguments (dùng dấu phẩy)</label>
              <textarea
                value={args}
                onChange={(e) => setArgs(e.target.value)}
                placeholder="arg1, arg2, arg3"
                className="w-full rounded border px-3 py-2 text-sm focus:border-gray-700 focus:outline-none"
                rows={3}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-gray-900 px-4 py-2 font-semibold text-white hover:bg-gray-800 disabled:opacity-70"
            >
              {loading ? <Spinner size={16} /> : 'Query'}
            </button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kết quả</CardTitle>
          <CardDescription>Phản hồi từ chaincode</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <div className="rounded bg-red-50 p-3 text-sm text-red-600">{error}</div>}
          {result && (
            <div className="rounded bg-green-50 p-3">
              <pre className="max-h-48 overflow-auto text-xs text-gray-700">{result}</pre>
            </div>
          )}
          {!error && !result && <div className="text-sm text-gray-500">Kết quả sẽ hiển thị ở đây</div>}
        </CardContent>
      </Card>
    </div>
  )
}

function InvokeTab() {
  const [channel, setChannel] = useState('testchan')
  const [chaincode, setChaincode] = useState('network-core')
  const [fcn, setFcn] = useState('RegisterIdentity')
  const [args, setArgs] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>('')
  const [error, setError] = useState<string>('')

  const handleInvoke = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult('')

    try {
      const res = await invokeChaincodeData({
        channel,
        chaincode,
        fcn,
        args: args
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
      })

      if (res.success) {
        setResult(`Transaction ID: ${res.transactionId}\n\n${res.data ? JSON.stringify(res.data, null, 2) : 'Invoke successful'}`)
      } else {
        setError(res.error || 'Invoke failed')
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Invoke Chaincode</CardTitle>
          <CardDescription>Gọi hàm write (ghi dữ liệu)</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvoke} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Channel</label>
              <input
                type="text"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full rounded border px-3 py-2 text-sm focus:border-gray-700 focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Chaincode</label>
              <input
                type="text"
                value={chaincode}
                onChange={(e) => setChaincode(e.target.value)}
                className="w-full rounded border px-3 py-2 text-sm focus:border-gray-700 focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Function</label>
              <input
                type="text"
                value={fcn}
                onChange={(e) => setFcn(e.target.value)}
                className="w-full rounded border px-3 py-2 text-sm focus:border-gray-700 focus:outline-none"
                placeholder="e.g., CreateData"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Arguments (dùng dấu phẩy)</label>
              <textarea
                value={args}
                onChange={(e) => setArgs(e.target.value)}
                placeholder="key, value, ..."
                className="w-full rounded border px-3 py-2 text-sm focus:border-gray-700 focus:outline-none"
                rows={3}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-70"
            >
              {loading ? <Spinner size={16} /> : 'Invoke'}
            </button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kết quả</CardTitle>
          <CardDescription>Phản hồi từ chaincode</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <div className="rounded bg-red-50 p-3 text-sm text-red-600">{error}</div>}
          {result && (
            <div className="rounded bg-blue-50 p-3">
              <pre className="max-h-48 overflow-auto text-xs text-gray-700">{result}</pre>
            </div>
          )}
          {!error && !result && <div className="text-sm text-gray-500">Kết quả sẽ hiển thị ở đây</div>}
        </CardContent>
      </Card>
    </div>
  )
}
