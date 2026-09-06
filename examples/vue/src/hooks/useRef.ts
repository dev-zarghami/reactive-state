import type {Subscription} from "rxjs";
import {onMounted, ref} from "vue";

export function useRef<T>(stream: { subscribe: (next: (value: T) => void) => Subscription }, initial: T) {
    const reference = ref<T>(initial);
    onMounted(() => {
        const sub = stream.subscribe((value) => reference.value = value);
        return () => sub.unsubscribe();
    });
    return reference;
}