import { onCleanup } from "solid-js";

export function useDebounce(signalSetter, delay) {
    let timerHandle;
    function debouncedSignalSetter(value:string) {
      clearTimeout(timerHandle);
      timerHandle = setTimeout(() => signalSetter(value), delay);
    }
    onCleanup(() => clearInterval(timerHandle));
    return debouncedSignalSetter;
  }