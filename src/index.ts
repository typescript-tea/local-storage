import { EffectManager, Dispatch, Result } from "@typescript-tea/core";
import { exhaustiveCheck } from "ts-exhaustive-check";

// -- See https://github.com/frontend-fp/elm-localstorage/blob/master/src/LocalStorage.elm

// -- COMMANDS

export type MyCmd<A> = GetValue<A> | SetValue<A> | RemoveValue<A> | Clear<A> | Keys<A>;

export type Json = null | boolean | number | string | ReadonlyArray<Json> | { readonly [prop: string]: Json };

export type Error =
  | { readonly type: "NoStorage" }
  | { readonly type: "UnexpectedPayload"; readonly payload: string }
  | { readonly type: "Overflow" };

export type GetValue<A> = {
  readonly home: typeof home;
  readonly type: "Get";
  readonly key: string;
  readonly gotResult: (result: Result<Error, Json | undefined>) => A;
};

/**
 * Get a value from local storage
 */
export function get<A>(key: string, gotResult: (result: Result<Error, Json | undefined>) => A): GetValue<A> {
  return {
    home,
    type: "Get",
    key,
    gotResult,
  };
}

export type SetValue<A> = {
  readonly home: typeof home;
  readonly type: "Set";
  readonly key: string;
  readonly value: Json;
  readonly completed: (error: Error | undefined) => A;
};

/**
 * Sets the string value for a given key. Will fail with NoStorage if
 * localStorage is not available in the browser.
 */
export function set<A>(key: string, value: Json, completed: (error: Error | undefined) => A): SetValue<A> {
  return {
    home,
    type: "Set",
    key,
    value,
    completed,
  };
}

export type RemoveValue<A> = {
  readonly home: typeof home;
  readonly type: "Remove";
  readonly key: string;
  readonly completed: (error: Error | undefined) => A;
};

/**
 * Removes the value for a given key. Task will fail with NoStorage if
 * localStorage is not available in the browser.
 */
export function remove<A>(key: string, completed: (error: Error | undefined) => A): RemoveValue<A> {
  return {
    home,
    type: "Remove",
    key,
    completed,
  };
}

export type Clear<A> = {
  readonly home: typeof home;
  readonly type: "Clear";
  readonly key: string;
  readonly completed: (error: Error | undefined) => A;
};

/**
 * Removes all keys and values from localstorage.
 */
export function clear<A>(key: string, completed: (error: Error | undefined) => A): Clear<A> {
  return {
    home,
    type: "Clear",
    key,
    completed,
  };
}

export type Keys<A> = {
  readonly home: typeof home;
  readonly type: "Keys";
  readonly key: string;
  readonly gotResult: (result: Result<Error, ReadonlyArray<string>>) => A;
};

/**
 * Returns all keys from localstorage.
 */
export function keys<A>(key: string, gotResult: (result: Result<Error, ReadonlyArray<string>>) => A): Keys<A> {
  return {
    home,
    type: "Keys",
    key,
    gotResult,
  };
}

export function mapCmd<A1, A2>(func: (a1: A1) => A2, cmd: MyCmd<A1>): MyCmd<A2> {
  switch (cmd.type) {
    case "Get":
      return { ...cmd, gotResult: (r: Result<Error, Json | undefined>) => func(cmd.gotResult(r)) };
    case "Keys":
      return { ...cmd, gotResult: (r: Result<Error, ReadonlyArray<string>>) => func(cmd.gotResult(r)) };
    case "Set":
    case "Remove":
    case "Clear":
      return { ...cmd, completed: (e) => func(cmd.completed(e)) };
    default:
      return exhaustiveCheck(cmd, true);
  }
}

// -- SUBSCRIPTIONS

export type MySub<A> = Changes<A>;

//-- See https://developer.mozilla.org/en-US/docs/Web/API/StorageEvent
export type ChangeEvent = {
  readonly key: string | null;
  readonly oldValue: string | null;
  readonly newValue: string | null;
  readonly url: string | null;
};

export type Changes<A> = {
  readonly home: typeof home;
  readonly type: "Changes";
  readonly onEvent: (e: ChangeEvent) => A;
};

/**
 * Subscribe to any changes in localstorage. These events occur only when
 * localstorage is changed in a different window than the one of the current
 * program. Only the `set` task results in an event; `remove` operations happen
 * without notice (unfortunately).
 */
export function changes<A>(onEvent: (e: ChangeEvent) => A): Changes<A> {
  return {
    home,
    type: "Changes",
    onEvent,
  };
}

export function mapSub<A1, A2>(func: (a1: A1) => A2, sub: MySub<A1>): MySub<A2> {
  return { ...sub, onEvent: (e) => func(sub.onEvent(e)) };
}

// -- EFFECT MANAGER

const home = "local-storage";

type State<A> =
  | {
      readonly subs: ReadonlyArray<MySub<A>>;
      readonly listener: (e: StorageEvent) => void | undefined;
    }
  | undefined;

const init = <A>(): State<A> => undefined;

export const createEffectManager = <ProgramAction>(): EffectManager<
  typeof home,
  ProgramAction,
  SelfAction,
  State<ProgramAction>,
  MyCmd<ProgramAction>,
  MySub<ProgramAction>
> => ({ home, mapCmd, mapSub, onEffects, onSelfAction });

// -- PROGRAM ACTIONS

function onEffects<ProgramAction>(
  dispatchProgram: Dispatch<ProgramAction>,
  dispatchSelf: Dispatch<SelfAction>,
  cmds: ReadonlyArray<MyCmd<ProgramAction>>,
  subs: ReadonlyArray<MySub<ProgramAction>>,
  state: State<ProgramAction> = init()
): State<ProgramAction> {
  // Handle cmds
  handleCmds(dispatchProgram, cmds);

  // Handle subs and return new state
  if (state !== undefined) {
    if (subs.length === 0) {
      // Was listening but now there are no subs => Stop listening
      window.removeEventListener("storage", state.listener);
      return undefined;
    }
    // Was listening and there are still subs => Keep listening
    return { subs, listener: state.listener };
  } else if (state === undefined) {
    if (subs.length === 0) {
      // Was not listening and now there are no subs => Do nothing
      return state;
    }
    // // Was not listening and now there are subs => Start listening
    const listener = (e: StorageEvent): void => dispatchSelf({ type: "ChangeEvent", event: e });
    window.addEventListener("storage", listener);
    return { subs, listener };
  } else {
    return exhaustiveCheck(state, true);
  }
}

function handleCmds<ProgramAction>(
  dispatchProgram: Dispatch<ProgramAction>,
  cmds: ReadonlyArray<MyCmd<ProgramAction>>
): void {
  for (const cmd of cmds) {
    switch (cmd.type) {
      case "Get":
        if (!isStorageAvailable()) {
          dispatchProgram(cmd.gotResult(Result.Err({ type: "NoStorage" })));
        } else {
          const value = localStorage.getItem(cmd.key);
          dispatchProgram(cmd.gotResult(Result.Ok(value ?? undefined)));
        }
        break;
      case "Clear":
      case "Keys":
      case "Remove":
        break;
      case "Set":
        if (!isStorageAvailable()) {
          dispatchProgram(cmd.completed({ type: "NoStorage" }));
        } else {
          try {
            localStorage.setItem(cmd.key, cmd.value);
            dispatchProgram(cmd.completed(undefined));
          } catch (e) {
            dispatchProgram(cmd.completed({ type: "Overflow" }));
          }
        }
        break;
      default:
        exhaustiveCheck(cmd, true);
    }
  }
}

// -- SELF ACTIONS

type SelfAction = { readonly type: "ChangeEvent"; readonly event: ChangeEvent };

function onSelfAction<AppAction>(
  dispatchProgram: Dispatch<AppAction>,
  _dispatchSelf: Dispatch<SelfAction>,
  action: SelfAction,
  state: State<AppAction> = init()
): State<AppAction> {
  if (state !== undefined) {
    for (const sub of state.subs) {
      dispatchProgram(sub.onEvent(action.event));
    }
  }
  return state;
}

function isStorageAvailable(): boolean {
  if (typeof window === "undefined") {
    return false;
  } else if (typeof window.localStorage === "undefined") {
    return false;
  }
  return true;
}
