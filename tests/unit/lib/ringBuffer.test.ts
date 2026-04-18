import { RingBuffer } from '@/lib/store/ringBuffer'

describe('RingBuffer', () => {
  it('starts empty with length 0', () => {
    const rb = new RingBuffer<number>(3)
    expect(rb.length).toBe(0)
    expect(rb.capacity).toBe(3)
  })

  it('toArray returns empty array when empty', () => {
    expect(new RingBuffer<string>(3).toArray()).toEqual([])
  })

  it('push increases length', () => {
    const rb = new RingBuffer<number>(5)
    expect(rb.push(1).length).toBe(1)
    expect(rb.push(1).push(2).length).toBe(2)
  })

  it('push returns a new instance leaving the original length unchanged', () => {
    const rb = new RingBuffer<number>(3)
    const rb1 = rb.push(1)
    expect(rb1).not.toBe(rb)
    expect(rb.length).toBe(0)
  })

  it('toArray returns items in insertion order', () => {
    let rb = new RingBuffer<string>(5)
    rb = rb.push('a').push('b').push('c')
    expect(rb.toArray()).toEqual(['a', 'b', 'c'])
  })

  it('length grows to capacity then stays fixed', () => {
    let rb = new RingBuffer<number>(3)
    rb = rb.push(1).push(2).push(3)
    expect(rb.length).toBe(3)
    rb = rb.push(4)
    expect(rb.length).toBe(3)
  })

  it('overwrites the oldest item when full', () => {
    let rb = new RingBuffer<string>(3)
    rb = rb.push('a').push('b').push('c').push('d')
    expect(rb.toArray()).toEqual(['b', 'c', 'd'])
  })

  it('wraps around correctly across multiple full cycles', () => {
    let rb = new RingBuffer<number>(3)
    for (let i = 1; i <= 9; i++) rb = rb.push(i)
    expect(rb.toArray()).toEqual([7, 8, 9])
  })

  it('clear returns a ring buffer with length 0', () => {
    let rb = new RingBuffer<number>(3)
    rb = rb.push(1).push(2).push(3).clear()
    expect(rb.length).toBe(0)
    expect(rb.toArray()).toEqual([])
  })

  it('cleared buffer accepts new pushes from the beginning', () => {
    let rb = new RingBuffer<number>(3)
    rb = rb.push(1).push(2).push(3).clear().push(4)
    expect(rb.toArray()).toEqual([4])
  })

  describe('last()', () => {
    it('returns undefined when empty', () => {
      expect(new RingBuffer<number>(3).last()).toBeUndefined()
    })

    it('returns the most recently pushed item', () => {
      const rb = new RingBuffer<string>(5).push('a').push('b').push('c')
      expect(rb.last()).toBe('c')
    })

    it('returns the newest item after overflow', () => {
      let rb = new RingBuffer<number>(3)
      rb = rb.push(1).push(2).push(3).push(4)
      expect(rb.last()).toBe(4)
    })
  })
})
