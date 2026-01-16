import logger from '@core/logger';
import { FabricError } from '@core/errors';

/**
 * Docker Executor - Fallback for gRPC operations
 * Executes peer CLI commands via Docker when gRPC fails
 */
export class DockerExecutor {
  private networkName: string;
  private peerContainer: string;

  constructor(networkName: string, peerContainer: string) {
    this.networkName = networkName;
    this.peerContainer = peerContainer;

    logger.debug('DockerExecutor initialized', {
      network: this.networkName,
      peer: this.peerContainer,
    });
  }

  /**
   * Execute peer chaincode query via Docker
   */
  async executePeerChaincodeQuery(
    channel: string,
    chaincode: string,
    functionName: string,
    _args: string[]
  ): Promise<any> {
    try {
      logger.warn('Using Docker executor for query (gRPC fallback)', {
        channel,
        chaincode,
        function: functionName,
      });

      // TODO: Implement Docker execution
      // const command = this.buildQueryCommand(channel, chaincode, functionName, args);
      // const result = await this.executeDockerCommand(command);
      // return this.parseQueryResult(result);

      // For now, simulate
      return this.simulateDockerQuery();
    } catch (error: any) {
      logger.error('Docker query execution failed', {
        channel,
        chaincode,
        error: error.message,
      });
      throw new FabricError(`Docker query failed: ${error.message}`, 500);
    }
  }

  /**
   * Execute peer chaincode invoke via Docker
   */
  async executePeerChaincodeInvoke(
    channel: string,
    chaincode: string,
    functionName: string,
    _args: string[]
  ): Promise<string> {
    try {
      logger.warn('Using Docker executor for invoke (gRPC fallback)', {
        channel,
        chaincode,
        function: functionName,
      });

      // TODO: Implement Docker execution
      // const command = this.buildInvokeCommand(channel, chaincode, functionName, args);
      // const result = await this.executeDockerCommand(command);
      // return this.parseTxId(result);

      // For now, simulate
      return this.simulateDockerInvoke();
    } catch (error: any) {
      logger.error('Docker invoke execution failed', {
        channel,
        chaincode,
        error: error.message,
      });
      throw new FabricError(`Docker invoke failed: ${error.message}`, 500);
    }
  }

  // =====================
  // SIMULATION METHODS
  // =====================
  // TODO: Remove these when implementing real Docker execution

  private async simulateDockerQuery(): Promise<any> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ status: 'success', data: { source: 'docker' } });
      }, 300);
    });
  }

  private async simulateDockerInvoke(): Promise<string> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const txId = `tx_docker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        resolve(txId);
      }, 400);
    });
  }
}
