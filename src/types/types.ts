import { KingOfTime } from "../punch-script";

export type Maybe<T> = null | undefined | T;
export type Action = typeof KingOfTime.Action;
export type ValueOf<T> = T[keyof T];
