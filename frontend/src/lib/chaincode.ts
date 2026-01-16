import { http } from './http'

export interface ChaincodeForwardRequest {
  chaincode: string
  command: 'query' | 'invoke' | 'read' | 'write'
  args: {
    channel: string
    function: string
    params?: string[]
  }
  msp_id?: string
  cert?: string
  private_key?: string
  public_read?: boolean
  org_domain?: string
}

export interface ChaincodeResponse {
  success: boolean
  data?: any
  message?: string
  error?: string
  transactionId?: string
}

export async function queryChaincode(payload: {
  chaincode: string
  channel: string
  function: string
  params?: string[]
}) {
  // Call Backend API (which will forward to Gateway)
  const res = await http.post<ChaincodeResponse>('/api/v1/chaincode/query', {
    channel: payload.channel,
    chaincode: payload.chaincode,
    function: payload.function,
    params: payload.params || [],
  })
  
  // Backend returns ChaincodeResponse format
  if (res.data && typeof res.data === 'object' && 'success' in res.data) {
    return res.data as ChaincodeResponse
  }
  
  return {
    success: true,
    data: res.data,
    error: null,
    transactionId: null,
  }
}

export async function invokeChaincode(payload: {
  chaincode: string
  channel: string
  function: string
  params?: string[]
}) {
  // Call Backend API (which will forward to Gateway)
  const res = await http.post<ChaincodeResponse>('/api/v1/chaincode/invoke', {
    channel: payload.channel,
    chaincode: payload.chaincode,
    function: payload.function,
    params: payload.params || [],
  })
  
  // Backend returns ChaincodeResponse format
  if (res.data && typeof res.data === 'object' && 'success' in res.data) {
    return res.data as ChaincodeResponse
  }
  
  return {
    success: true,
    data: res.data,
    error: null,
    transactionId: null,
  }
}

// Legacy functions for backward compatibility
export async function queryChaincodeData(payload: {
  channel: string
  chaincode: string
  fcn: string
  args: string[]
}) {
  return queryChaincode({
    chaincode: payload.chaincode,
    channel: payload.channel,
    function: payload.fcn,
    params: payload.args,
  })
}

export async function invokeChaincodeData(payload: {
  channel: string
  chaincode: string
  fcn: string
  args: string[]
}) {
  return invokeChaincode({
    chaincode: payload.chaincode,
    channel: payload.channel,
    function: payload.fcn,
    params: payload.args,
  })
}
