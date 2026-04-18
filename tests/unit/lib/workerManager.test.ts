import { WorkerManager } from '@/lib/store/workerManager'

type MockWorker = { postMessage: ReturnType<typeof vi.fn>; terminate: ReturnType<typeof vi.fn>; onmessage: null; onerror: null }

function makeMockWorker(): MockWorker {
  return { postMessage: vi.fn(), terminate: vi.fn(), onmessage: null, onerror: null }
}

describe('WorkerManager', () => {
  it('creates a worker on the first getOrCreate call', () => {
    const instance = makeMockWorker()
    const factory = vi.fn().mockReturnValue(instance)
    const manager = new WorkerManager(factory)

    manager.getOrCreate()

    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('returns the same worker instance on subsequent getOrCreate calls', () => {
    const factory = vi.fn().mockImplementation(makeMockWorker)
    const manager = new WorkerManager(factory)

    const first = manager.getOrCreate()
    const second = manager.getOrCreate()

    expect(factory).toHaveBeenCalledTimes(1)
    expect(second).toBe(first)
  })

  it('exposes the current worker via the worker getter', () => {
    const instance = makeMockWorker()
    const manager = new WorkerManager(vi.fn().mockReturnValue(instance))

    expect(manager.worker).toBeNull()
    manager.getOrCreate()
    expect(manager.worker).toBe(instance)
  })

  it('dispose terminates the worker', () => {
    const instance = makeMockWorker()
    const manager = new WorkerManager(vi.fn().mockReturnValue(instance))
    manager.getOrCreate()

    manager.dispose()

    expect(instance.terminate).toHaveBeenCalledTimes(1)
  })

  it('dispose nulls the worker reference', () => {
    const manager = new WorkerManager(vi.fn().mockImplementation(makeMockWorker))
    manager.getOrCreate()

    manager.dispose()

    expect(manager.worker).toBeNull()
  })

  it('getOrCreate after dispose creates a fresh worker', () => {
    const factory = vi.fn().mockImplementation(makeMockWorker)
    const manager = new WorkerManager(factory)

    manager.getOrCreate()
    manager.dispose()
    manager.getOrCreate()

    expect(factory).toHaveBeenCalledTimes(2)
  })

  it('dispose is a no-op when no worker has been created', () => {
    const manager = new WorkerManager(vi.fn().mockImplementation(makeMockWorker))

    expect(() => manager.dispose()).not.toThrow()
  })
})
