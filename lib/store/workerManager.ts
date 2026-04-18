type WorkerFactory = () => Worker

export class WorkerManager {
  private _worker: Worker | null = null
  private readonly _factory: WorkerFactory

  constructor(factory: WorkerFactory) {
    this._factory = factory
  }

  getOrCreate(): Worker {
    if (!this._worker) {
      this._worker = this._factory()
    }
    return this._worker
  }

  get worker(): Worker | null {
    return this._worker
  }

  dispose(): void {
    if (this._worker) {
      this._worker.terminate()
      this._worker = null
    }
  }
}
