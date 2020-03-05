import { EffectManager, Dispatch, Result } from "@typescript-tea/core";
import { exhaustiveCheck } from "ts-exhaustive-check";

// -- VALUES

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
  readonly gotError: (error: Error | undefined) => A;
};

/**
 * Sets the string value for a given key. Will fail with NoStorage if
 * localStorage is not available in the browser.
 */
export function set<A>(key: string, value: Json, gotError: (error: Error | undefined) => A): SetValue<A> {
  return {
    home,
    type: "Set",
    key,
    value,
    gotError,
  };
}

export type RemoveValue<A> = {
  readonly home: typeof home;
  readonly type: "Remove";
  readonly key: string;
  readonly gotError: (error: Error | undefined) => A;
};

/**
 * Removes the value for a given key. Task will fail with NoStorage if
 * localStorage is not available in the browser.
 */
export function remove<A>(key: string, gotError: (error: Error | undefined) => A): RemoveValue<A> {
  return {
    home,
    type: "Remove",
    key,
    gotError,
  };
}

export type Clear<A> = {
  readonly home: typeof home;
  readonly type: "Clear";
  readonly key: string;
  readonly gotError: (error: Error | undefined) => A;
};

/**
 * Removes all keys and values from localstorage.
 */
export function clear<A>(key: string, gotError: (error: Error | undefined) => A): Clear<A> {
  return {
    home,
    type: "Clear",
    key,
    gotError,
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

// -- COMMANDS and SUBSCRIPTIONS

export type MyCmd<A> = GetValue<A> | SetValue<A> | RemoveValue<A> | Clear<A> | Keys<A>;

export function mapCmd<A1, A2>(func: (a1: A1) => A2, cmd: MyCmd<A1>): MyCmd<A2> {
  switch (cmd.type) {
    case "Get":
      return { ...cmd, gotResult: (r: Result<Error, Json | undefined>) => func(cmd.gotResult(r)) };
    case "Keys":
      return { ...cmd, gotResult: (r: Result<Error, ReadonlyArray<string>>) => func(cmd.gotResult(r)) };
    case "Set":
    case "Remove":
    case "Clear":
      return { ...cmd, gotError: (e) => func(cmd.gotError(e)) };
    default:
      return exhaustiveCheck(cmd, true);
  }
}

export type MySub<A> = {
  readonly home: typeof home;
  readonly type: "MySub";
  readonly tracker: string;
  readonly toMsg: (p: string) => A;
};

export function mapSub<A1, A2>(func: (a1: A1) => A2, sub: MySub<A1>): MySub<A2> {
  return { ...sub, toMsg: (p: string) => func(sub.toMsg(p)) };
}

// -- EFFECT MANAGER

const home = "local-storage";

type State<A> = {
  readonly subs: ReadonlyArray<MySub<A>>;
};

const init = <A>(): State<A> => ({ subs: [] });

export const createEffectManager = <ProgramAction>(): EffectManager<
  typeof home,
  ProgramAction,
  SelfAction,
  State<ProgramAction>,
  MyCmd<ProgramAction>,
  MySub<ProgramAction>
> => ({
  home,
  mapCmd: (_, c) => c,
  mapSub: (_, s) => s,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEffects: onEffects as any,
  onSelfAction,
});

// -- APP MESSAGES

function onEffects<AppAction>(
  _dispatchApp: Dispatch<AppAction>,
  _dispatchSelf: Dispatch<SelfAction>,
  _cmds: ReadonlyArray<MyCmd<AppAction>>,
  subs: ReadonlyArray<MySub<AppAction>>,
  _state: State<AppAction> = init()
): State<AppAction> {
  return { subs };
}

// -- SELF MESSAGES

type SelfAction = { readonly type: "Progress"; readonly tracker: string };

function onSelfAction<AppAction>(
  _dispatchApp: Dispatch<AppAction>,
  _dispatchSelf: Dispatch<SelfAction>,
  _action: SelfAction,
  state: State<AppAction> = init()
): State<AppAction> {
  //   for (const sub of state.subs) {
  //     if (sub.tracker === action.tracker) {
  //       dispatchApp(sub.toMsg(action.progress));
  //     }
  //   }
  return state;
}
