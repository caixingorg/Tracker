import { 
  generateUUID, 
  shouldSample, 
  deepMerge,
  throttle,
  debounce,
  safeGet,
  maskSensitiveData
} from '../common';

describe('common.js tests', () => {
  describe('generateUUID', () => {
    test('should return a string', () => {
      expect(typeof generateUUID()).toBe('string');
    });

    test('should return a string in UUID format', () => {
      const uuid = generateUUID();
      // Basic UUID format check: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      // Check length
      expect(uuid.length).toBe(36);
      // Check hyphens
      expect(uuid[8]).toBe('-');
      expect(uuid[13]).toBe('-');
      expect(uuid[18]).toBe('-');
      expect(uuid[23]).toBe('-');
      // Check version '4'
      expect(uuid[14]).toBe('4');
      // Check variant (8, 9, a, or b)
      expect(['8', '9', 'a', 'b']).toContain(uuid[19]);
    });

    test('should generate different UUIDs on multiple calls', () => {
      const uuid1 = generateUUID();
      const uuid2 = generateUUID();
      expect(uuid1).not.toBe(uuid2);
    });
  });

  describe('shouldSample', () => {
    test('should always return true for sampleRate 1.0', () => {
      expect(shouldSample(1.0)).toBe(true);
    });

    test('should always return false for sampleRate 0.0', () => {
      expect(shouldSample(0.0)).toBe(false);
    });

    test('should return boolean for intermediate sampleRate (e.g., 0.5)', () => {
      const result = shouldSample(0.5);
      expect(typeof result).toBe('boolean');
    });

    test('should behave correctly with mocked Math.random', () => {
      const originalMathRandom = Math.random;

      Math.random = jest.fn(() => 0.4);
      expect(shouldSample(0.5)).toBe(true);

      Math.random = jest.fn(() => 0.6);
      expect(shouldSample(0.5)).toBe(false);
      
      Math.random = jest.fn(() => 0.4999);
      expect(shouldSample(0.5)).toBe(true);

      Math.random = jest.fn(() => 0.5);
      expect(shouldSample(0.5)).toBe(false);

      Math.random = originalMathRandom;
    });
  });

  describe('deepMerge', () => {
    test('should merge simple objects', () => {
      const target = { a: 1, b: 2 };
      const source = { b: 3, c: 4 };
      const expected = { a: 1, b: 3, c: 4 };
      expect(deepMerge(target, source)).toEqual(expected);
    });

    test('should merge nested objects', () => {
      const target = { a: 1, b: { x: 10, y: 20 } };
      const source = { b: { y: 30, z: 40 }, c: 3 };
      const expected = { a: 1, b: { x: 10, y: 30, z: 40 }, c: 3 };
      expect(deepMerge(target, source)).toEqual(expected);
    });
    
    test('source properties should overwrite target properties, including nested', () => {
        const target = { a: 1, b: { x: 10, y: 20 }, d: 100 };
        const source = { b: { y: 30, z: 40 }, c: 3, d: undefined };
        const expected = { a: 1, b: { x: 10, y: 30, z: 40 }, c: 3, d: undefined };
        expect(deepMerge(target, source)).toEqual(expected);
    });

    test('should not merge if source is null or undefined', () => {
      const target = { a: 1, b: 2 };
      expect(deepMerge(target, null)).toEqual(target);
      expect(deepMerge(target, undefined)).toEqual(target);
    });

    test('should handle cases where target key is not an object during merge', () => {
      const target = { a: 1, b: 'not an object' };
      const source = { b: { y: 30, z: 40 } };
      const expected = { a: 1, b: { y: 30, z: 40 } };
      expect(deepMerge(target, source)).toEqual(expected);
    });
    
    test('should handle cases where source key is not an object during merge', () => {
      const target = { a: 1, b: { x: 10, y: 20 } };
      const source = { b: 'is a string now' };
      const expected = { a: 1, b: 'is a string now' };
      expect(deepMerge(target, source)).toEqual(expected);
    });

    test('arrays should be replaced, not merged', () => {
      const target = { a: [1, 2], b: { x: 1 } };
      const source = { a: [3, 4] };
      const expected = { a: [3, 4], b: { x: 1 } };
      expect(deepMerge(target, source)).toEqual(expected);

      const target2 = { a: [1, 2, { m: 1 }] };
      const source2 = { a: [3, 4, { n: 2 }] };
      const expected2 = { a: [3, 4, { n: 2 }] };
      expect(deepMerge(target2, source2)).toEqual(expected2);
    });
    
    test('should not modify the original target object', () => {
      const target = { a: 1, b: { x: 10, y: 20 } };
      const source = { b: { y: 30, z: 40 }, c: 3 };
      deepMerge(target, source);
      expect(target).toEqual({ a: 1, b: { x: 10, y: 20 } });
    });
  });

  describe('throttle', () => {
    jest.useFakeTimers();

    afterEach(() => {
      jest.clearAllTimers();
    });

    test('should execute the function immediately on first call', () => {
      const mockFn = jest.fn();
      const throttledFn = throttle(mockFn, 100);
      
      throttledFn();
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test('should not execute the function again within the delay period', () => {
      const mockFn = jest.fn();
      const throttledFn = throttle(mockFn, 100);
      
      throttledFn(); // First call
      expect(mockFn).toHaveBeenCalledTimes(1);
      
      throttledFn(); // Second call within delay
      throttledFn(); // Third call within delay
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test('should execute the function again after the delay period', () => {
      const mockFn = jest.fn();
      const throttledFn = throttle(mockFn, 100);
      
      throttledFn(); // First call
      expect(mockFn).toHaveBeenCalledTimes(1);
      
      jest.advanceTimersByTime(50);
      throttledFn(); // Call within delay
      expect(mockFn).toHaveBeenCalledTimes(1);
      
      jest.advanceTimersByTime(50); // Total 100ms passed
      throttledFn(); // Call after delay
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    test('should pass arguments to the throttled function', () => {
        const mockFn = jest.fn();
        const throttledFn = throttle(mockFn, 100);
        
        throttledFn(1, 'a');
        expect(mockFn).toHaveBeenCalledWith(1, 'a');
    });

    test('should maintain `this` context', () => {
        const mockFn = jest.fn();
        const context = { key: 'value' };
        const throttledFn = throttle(mockFn, 100);
        
        throttledFn.call(context);
        expect(mockFn.mock.contexts[0]).toBe(context);
    });
  });

  describe('debounce', () => {
    jest.useFakeTimers();

    afterEach(() => {
      jest.clearAllTimers();
    });

    test('should not execute the function while calls are within delay period', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);
      
      debouncedFn();
      jest.advanceTimersByTime(50);
      debouncedFn();
      jest.advanceTimersByTime(50);
      debouncedFn();
      
      expect(mockFn).not.toHaveBeenCalled();
    });

    test('should execute the function after the delay period from the last call', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);
      
      debouncedFn(); // Call 1
      jest.advanceTimersByTime(50);
      debouncedFn(); // Call 2 (resets timer)
      
      expect(mockFn).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(100); // Wait for full delay after last call
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test('should execute only once for multiple rapid calls', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);
      
      debouncedFn();
      debouncedFn();
      debouncedFn();
      
      jest.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
    
    test('should pass arguments from the last call to the debounced function', () => {
        const mockFn = jest.fn();
        const debouncedFn = debounce(mockFn, 100);
        
        debouncedFn(1, 'a');
        debouncedFn(2, 'b');
        
        jest.advanceTimersByTime(100);
        expect(mockFn).toHaveBeenCalledWith(2, 'b');
    });

    test('should maintain `this` context from the last call', () => {
        const mockFn = jest.fn();
        const context1 = { name: 'context1' };
        const context2 = { name: 'context2' };
        const debouncedFn = debounce(mockFn, 100);
        
        debouncedFn.call(context1, 1);
        debouncedFn.call(context2, 2);
        
        jest.advanceTimersByTime(100);
        expect(mockFn.mock.contexts[0]).toBe(context2);
    });
  });

  describe('safeGet', () => {
    const obj = {
      a: 1,
      b: {
        c: 2,
        d: {
          e: 3
        }
      },
      f: null,
      g: [{ h: 4 }]
    };

    test('should get existing top-level properties', () => {
      expect(safeGet(obj, 'a')).toBe(1);
    });

    test('should get existing nested properties', () => {
      expect(safeGet(obj, 'b.c')).toBe(2);
      expect(safeGet(obj, 'b.d.e')).toBe(3);
    });

    test('should get property from an array element', () => {
      expect(safeGet(obj, 'g.0.h')).toBe(4);
    });
    
    test('should return defaultValue if path is invalid or property does not exist', () => {
      expect(safeGet(obj, 'x', 'default')).toBe('default');
      expect(safeGet(obj, 'a.x.y', 'default')).toBe('default');
      expect(safeGet(obj, 'b.d.z', 'default')).toBe('default');
    });

    test('should return undefined if path is invalid and no defaultValue is provided', () => {
      expect(safeGet(obj, 'x')).toBeUndefined();
      expect(safeGet(obj, 'b.d.z')).toBeUndefined();
    });

    test('should return defaultValue if any part of the path is null', () => {
      expect(safeGet(obj, 'f.x.y', 'default')).toBe('default');
    });
    
    test('should return defaultValue if any part of the path (except the last) is not an object', () => {
      expect(safeGet(obj, 'a.x', 'default')).toBe('default'); // obj.a is number
    });

    test('should return defaultValue for empty or invalid inputs', () => {
      expect(safeGet(null, 'a.b', 'default')).toBe('default');
      expect(safeGet(undefined, 'a.b', 'default')).toBe('default');
      expect(safeGet({}, 'a.b', 'default')).toBe('default');
      expect(safeGet(obj, '', 'default')).toBe('default');
      expect(safeGet(obj, null, 'default')).toBe('default');
    });
  });

  describe('maskSensitiveData', () => {
    test('should return input if text is null or empty', () => {
      expect(maskSensitiveData(null)).toBeNull();
      expect(maskSensitiveData('')).toBe('');
    });

    // Email masking
    test('should mask email addresses correctly (isEmail=true)', () => {
      expect(maskSensitiveData('test@example.com', true)).toBe('te**@example.com');
      expect(maskSensitiveData('a@example.com', true)).toBe('a@example.com'); // short username
      expect(maskSensitiveData('ab@example.com', true)).toBe('ab@example.com'); // short username
      expect(maskSensitiveData('abc@example.com', true)).toBe('ab*@example.com');
    });

    test('should mask email addresses correctly (auto-detected)', () => {
        expect(maskSensitiveData('test@example.com')).toBe('te**@example.com');
        expect(maskSensitiveData('user.name.long@company.co.uk')).toBe('us***********@company.co.uk');
    });


    // Phone number masking
    test('should mask 10-digit phone numbers', () => {
      expect(maskSensitiveData('1234567890')).toBe('123****7890');
    });
    
    test('should mask 11-digit phone numbers', () => {
      expect(maskSensitiveData('12345678901')).toBe('123****8901');
    });

    // ID number masking
    test('should mask 15-digit ID numbers', () => {
      expect(maskSensitiveData('123456789012345')).toBe('1234**********2345');
    });

    test('should mask 18-digit ID numbers', () => {
      expect(maskSensitiveData('123456789012345678')).toBe('1234**********5678');
    });

    // Generic string masking
    test('should mask generic strings longer than 5 chars', () => {
      expect(maskSensitiveData('HelloWorld')).toBe('He******ld'); // 10 chars
      expect(maskSensitiveData('abcdef')).toBe('ab**ef'); // 6 chars
    });

    test('should not mask generic strings 5 chars or shorter', () => {
      expect(maskSensitiveData('short')).toBe('short'); // 5 chars
      expect(maskSensitiveData('tiny')).toBe('tiny');   // 4 chars
      expect(maskSensitiveData('abc')).toBe('abc');
      expect(maskSensitiveData('ab')).toBe('ab');
      expect(maskSensitiveData('a')).toBe('a');
    });
    
    test('should not mistake non-email, non-phone, non-id as one of them', () => {
        expect(maskSensitiveData('notanemailorphone')).toBe('no*************ne'); // length 17
        expect(maskSensitiveData('12345')).toBe('12345'); // length 5, not phone/id
        expect(maskSensitiveData('example.com')).toBe('ex*******om'); // length 11, not email
    });
  });
});
