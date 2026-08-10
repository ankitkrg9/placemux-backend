class CircuitBreaker {
    constructor({ failureThreshold = 5, successThreshold = 2, timeout = 10000, resetTimeout = 30000 } = {}) {
        this.failureThreshold = failureThreshold;
        this.successThreshold = successThreshold;
        this.timeout = timeout;
        this.resetTimeout = resetTimeout;

        this.state = "CLOSED"; // CLOSED, OPEN, HALF
        this.failures = 0;
        this.successes = 0;
        this.nextAttempt = Date.now();
    }

    async exec(fn) {
        if (this.state === "OPEN") {
            if (Date.now() > this.nextAttempt) {
                this.state = "HALF";
            } else {
                const err = new Error("Circuit is open");
                err.code = "EOPEN";
                throw err;
            }
        }

        try {
            const res = await Promise.race([
                fn(),
                new Promise((_, rej) => setTimeout(() => rej(new Error("Timeout")), this.timeout))
            ]);

            this._onSuccess();
            return res;
        } catch (err) {
            this._onFailure();
            throw err;
        }
    }

    _onSuccess() {
        if (this.state === "HALF") {
            this.successes += 1;
            if (this.successes >= this.successThreshold) {
                this._reset();
            }
        } else {
            this._reset();
        }
    }

    _onFailure() {
        this.failures += 1;
        if (this.failures >= this.failureThreshold) {
            this._trip();
        }
    }

    _trip() {
        this.state = "OPEN";
        this.nextAttempt = Date.now() + this.resetTimeout;
    }

    _reset() {
        this.failures = 0;
        this.successes = 0;
        this.state = "CLOSED";
    }
}

module.exports = CircuitBreaker;
