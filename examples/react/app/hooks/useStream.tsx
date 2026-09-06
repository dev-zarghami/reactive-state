import type {Subscription} from "rxjs";
import {useEffect, useState} from "react";

export function useStream<T>(stream: { subscribe: (next: (value: T) => void) => Subscription }, initial: T) {
    const [value, setValue] = useState(initial);
    useEffect(() => {
        const sub = stream.subscribe(setValue);
        return () => sub.unsubscribe();
    }, [stream]);
    return value;
}