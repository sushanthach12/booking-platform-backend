import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';

interface CircuitState {
  failures: number;
  lastFailureTime: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  halfOpenSuccesses: number;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private circuits: Map<string, CircuitState> = new Map();
  private readonly failureThreshold = 5;
  private readonly timeout = 60000;
  private readonly successThreshold = 2;

  async execute<T>(
    serviceName: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    const circuit = this.getCircuit(serviceName);

    if (circuit.state === 'OPEN') {
      if (Date.now() - circuit.lastFailureTime > this.timeout) {
        circuit.state = 'HALF_OPEN';
        circuit.halfOpenSuccesses = 0;
        this.logger.log(
          `Circuit breaker for ${serviceName} moved to HALF_OPEN`,
        );
      } else {
        throw new HttpException(
          `Circuit breaker is OPEN for ${serviceName}`,
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
    }

    try {
      const result = await operation();
      this.onSuccess(serviceName, circuit);
      return result;
    } catch (error) {
      this.onFailure(serviceName, circuit);
      throw error;
    }
  }

  private getCircuit(serviceName: string): CircuitState {
    if (!this.circuits.has(serviceName)) {
      this.circuits.set(serviceName, {
        failures: 0,
        lastFailureTime: 0,
        state: 'CLOSED',
        halfOpenSuccesses: 0,
      });
    }
    return this.circuits.get(serviceName)!;
  }

  private onSuccess(serviceName: string, circuit: CircuitState): void {
    if (circuit.state === 'HALF_OPEN') {
      circuit.halfOpenSuccesses++;
      if (circuit.halfOpenSuccesses >= this.successThreshold) {
        circuit.failures = 0;
        circuit.state = 'CLOSED';
        circuit.halfOpenSuccesses = 0;
        this.logger.log(`Circuit breaker for ${serviceName} moved to CLOSED`);
      }
      return;
    }

    if (circuit.state === 'CLOSED') {
      circuit.failures = Math.max(0, circuit.failures - 1);
    }
  }

  private onFailure(serviceName: string, circuit: CircuitState): void {
    if (circuit.state === 'HALF_OPEN') {
      circuit.state = 'OPEN';
      circuit.failures = this.failureThreshold;
      circuit.lastFailureTime = Date.now();
      this.logger.warn(
        `Circuit breaker for ${serviceName} moved to OPEN after HALF_OPEN failure`,
      );
      return;
    }

    circuit.failures++;
    circuit.lastFailureTime = Date.now();

    if (circuit.failures >= this.failureThreshold) {
      // circuit.state = 'OPEN';
      this.logger.warn(
        `Circuit breaker for ${serviceName} moved to OPEN after ${circuit.failures} failures`,
      );
    }
  }
}
