import { describe, it, expect } from 'vitest'
import { Vec3, type Vector3 } from '../../../src/kernel/utils/vector3'

describe('Vec3', () => {
  describe('create()', () => {
    it('should create a vector with given coordinates', () => {
      const v = Vec3.create(1, 2, 3)

      expect(v.x).toBe(1)
      expect(v.y).toBe(2)
      expect(v.z).toBe(3)
    })

    it('should handle negative coordinates', () => {
      const v = Vec3.create(-5, -10, -15)

      expect(v.x).toBe(-5)
      expect(v.y).toBe(-10)
      expect(v.z).toBe(-15)
    })

    it('should handle decimal coordinates', () => {
      const v = Vec3.create(1.5, 2.75, 3.125)

      expect(v.x).toBe(1.5)
      expect(v.y).toBe(2.75)
      expect(v.z).toBe(3.125)
    })

    it('should handle zero vector', () => {
      const v = Vec3.create(0, 0, 0)

      expect(v.x).toBe(0)
      expect(v.y).toBe(0)
      expect(v.z).toBe(0)
    })
  })

  describe('clone()', () => {
    it('should create an independent copy of a vector', () => {
      const original = Vec3.create(1, 2, 3)
      const copy = Vec3.clone(original)

      expect(copy).toEqual(original)
      expect(copy).not.toBe(original) // Different reference
    })

    it('should not be affected by changes to original', () => {
      const original: Vector3 = { x: 1, y: 2, z: 3 }
      const copy = Vec3.clone(original)

      original.x = 100

      expect(copy.x).toBe(1)
    })
  })

  describe('add()', () => {
    it('should add two vectors correctly', () => {
      const a = Vec3.create(1, 2, 3)
      const b = Vec3.create(4, 5, 6)

      const result = Vec3.add(a, b)

      expect(result).toEqual({ x: 5, y: 7, z: 9 })
    })

    it('should handle negative values', () => {
      const a = Vec3.create(10, 20, 30)
      const b = Vec3.create(-5, -10, -15)

      const result = Vec3.add(a, b)

      expect(result).toEqual({ x: 5, y: 10, z: 15 })
    })

    it('should handle adding zero vector', () => {
      const a = Vec3.create(1, 2, 3)
      const zero = Vec3.create(0, 0, 0)

      const result = Vec3.add(a, zero)

      expect(result).toEqual(a)
    })

    it('should not modify original vectors', () => {
      const a = Vec3.create(1, 2, 3)
      const b = Vec3.create(4, 5, 6)

      Vec3.add(a, b)

      expect(a).toEqual({ x: 1, y: 2, z: 3 })
      expect(b).toEqual({ x: 4, y: 5, z: 6 })
    })
  })

  describe('sub()', () => {
    it('should subtract two vectors correctly', () => {
      const a = Vec3.create(10, 20, 30)
      const b = Vec3.create(4, 5, 6)

      const result = Vec3.sub(a, b)

      expect(result).toEqual({ x: 6, y: 15, z: 24 })
    })

    it('should handle subtraction resulting in negatives', () => {
      const a = Vec3.create(1, 2, 3)
      const b = Vec3.create(10, 20, 30)

      const result = Vec3.sub(a, b)

      expect(result).toEqual({ x: -9, y: -18, z: -27 })
    })

    it('should return zero vector when subtracting itself', () => {
      const a = Vec3.create(5, 10, 15)

      const result = Vec3.sub(a, a)

      expect(result).toEqual({ x: 0, y: 0, z: 0 })
    })
  })

  describe('distance()', () => {
    it('should calculate distance between two points', () => {
      const a = Vec3.create(0, 0, 0)
      const b = Vec3.create(3, 4, 0) // 3-4-5 triangle

      const result = Vec3.distance(a, b)

      expect(result).toBe(5)
    })

    it('should return 0 for same point', () => {
      const a = Vec3.create(5, 10, 15)

      const result = Vec3.distance(a, a)

      expect(result).toBe(0)
    })

    it('should calculate 3D distance correctly', () => {
      const a = Vec3.create(0, 0, 0)
      const b = Vec3.create(1, 2, 2) // sqrt(1 + 4 + 4) = 3

      const result = Vec3.distance(a, b)

      expect(result).toBe(3)
    })

    it('should be commutative (a to b = b to a)', () => {
      const a = Vec3.create(1, 2, 3)
      const b = Vec3.create(10, 20, 30)

      expect(Vec3.distance(a, b)).toBe(Vec3.distance(b, a))
    })

    it('should handle negative coordinates', () => {
      const a = Vec3.create(-5, -5, -5)
      const b = Vec3.create(5, 5, 5)

      // Distance = sqrt((10)^2 + (10)^2 + (10)^2) = sqrt(300)
      const result = Vec3.distance(a, b)

      expect(result).toBeCloseTo(Math.sqrt(300))
    })
  })

  describe('equals()', () => {
    it('should return true for equal vectors', () => {
      const a = Vec3.create(1, 2, 3)
      const b = Vec3.create(1, 2, 3)

      expect(Vec3.equals(a, b)).toBe(true)
    })

    it('should return false for different x', () => {
      const a = Vec3.create(1, 2, 3)
      const b = Vec3.create(99, 2, 3)

      expect(Vec3.equals(a, b)).toBe(false)
    })

    it('should return false for different y', () => {
      const a = Vec3.create(1, 2, 3)
      const b = Vec3.create(1, 99, 3)

      expect(Vec3.equals(a, b)).toBe(false)
    })

    it('should return false for different z', () => {
      const a = Vec3.create(1, 2, 3)
      const b = Vec3.create(1, 2, 99)

      expect(Vec3.equals(a, b)).toBe(false)
    })

    it('should handle zero vectors', () => {
      const a = Vec3.create(0, 0, 0)
      const b = Vec3.create(0, 0, 0)

      expect(Vec3.equals(a, b)).toBe(true)
    })

    it('should handle decimal precision', () => {
      const a = Vec3.create(1.5, 2.5, 3.5)
      const b = Vec3.create(1.5, 2.5, 3.5)

      expect(Vec3.equals(a, b)).toBe(true)
    })
  })
})
