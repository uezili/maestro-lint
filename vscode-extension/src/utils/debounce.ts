export interface DebouncedFn {
  (): void;
  cancel(): void;
}

export function createDebouncedFn(fn: () => void, delay: number): DebouncedFn {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const wrapped = (() => {
    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      fn();
    }, delay);
  }) as DebouncedFn;

  wrapped.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  return wrapped;
}
