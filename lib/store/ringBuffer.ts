// Internal tag to allow the private factory constructor path.
const _INTERNAL = Symbol('RingBuffer.internal')

export class RingBuffer<T> {
  readonly capacity: number
  private readonly _buf: (T | undefined)[]
  private readonly _head: number // index of the next write slot
  private readonly _size: number // number of valid items (0..capacity)

  constructor(capacity: number)
  constructor(tag: typeof _INTERNAL, buf: (T | undefined)[], head: number, size: number)
  constructor(
    capacityOrTag: number | typeof _INTERNAL,
    buf?: (T | undefined)[],
    head?: number,
    size?: number,
  ) {
    if (capacityOrTag === _INTERNAL) {
      this._buf = buf!
      this._head = head!
      this._size = size!
      this.capacity = buf!.length
    } else {
      this.capacity = capacityOrTag
      this._buf = new Array<T | undefined>(capacityOrTag).fill(undefined)
      this._head = 0
      this._size = 0
    }
  }

  get length(): number {
    return this._size
  }

  push(item: T): RingBuffer<T> {
    // Write to the current head slot (mutates the shared backing array),
    // then advance head and return a new wrapper.
    this._buf[this._head] = item
    return new RingBuffer<T>(
      _INTERNAL,
      this._buf,
      (this._head + 1) % this.capacity,
      Math.min(this._size + 1, this.capacity),
    )
  }

  last(): T | undefined {
    if (this._size === 0) return undefined
    return this._buf[(this._head - 1 + this.capacity) % this.capacity] as T
  }

  toArray(): T[] {
    const start = (this._head - this._size + this.capacity) % this.capacity
    return Array.from(
      { length: this._size },
      (_, i) => this._buf[(start + i) % this.capacity] as T,
    )
  }

  clear(): RingBuffer<T> {
    return new RingBuffer<T>(_INTERNAL, this._buf, 0, 0)
  }
}
