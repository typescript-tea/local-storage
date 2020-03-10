// import { JSDOM } from "jsdom";
import * as LocalStorage from "../index";

// beforeAll(() => {
//   const html = ``;

//   const dom = new JSDOM(html, { url: "http://localhost", runScripts: "dangerously" });
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   (global as any).window = dom.window;
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   (global as any).document = window.document;
// });

// afterAll(() => {
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   (global as any).window = undefined;
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   (global as any).document = undefined;
// });

test("createEffectManager", () => {
  const em = LocalStorage.createEffectManager();
  expect(Object.keys(em).length).toBe(5);
});

test("set command", () => {
  const em = LocalStorage.createEffectManager();
  const doNothing = (): void => {
    // Do nothing
  };
  const dispatchProgram = jest.fn();
  const setItemSpy = jest.spyOn(Storage.prototype, "setItem");
  const cmd = LocalStorage.set("olle", "kalle", doNothing);
  em.onEffects(dispatchProgram, doNothing, [cmd], [], undefined);
  expect(dispatchProgram).toBeCalledWith(undefined);
  expect(setItemSpy).toBeCalledWith("olle", "kalle");
});

// test("update message", () => {
//   const div = document.createElement("div");
//   document.body.appendChild(div);

//   div.addEventListener("click", () => {
//     console.log("I was clicked.");
//   });

//   const event = document.createEvent("CustomEvent");
//   event.initEvent("click", true, true);
//   div.dispatchEvent(event);

//   let a = 5;
//   window.addEventListener("storage", () => {
//     a = 6;
//     console.log("asdfas");
//   });
//   window.localStorage.setItem("olle", "kalle");
//   const theValue = window.localStorage.getItem("olle");
//   expect(a).toBe(6);
//   expect(theValue).toBe("kalle");
//   expect(document.getElementById("msg")!.innerHTML).toBe("Hello, World!");
//   updateMsg("The new msg!");
//   expect(document.getElementById("msg")!.innerHTML).toBe("The new msg!");
// });

// function updateMsg(newMsg: string): void {
//   document.getElementById("msg")!.innerHTML = newMsg;
// }

// describe("updateMsg", function() {
//   before(function() {
//     return JSDOM.fromFile("index.html").then((dom) => {
//       global.window = dom.window;
//       global.document = window.document;
//     });
//   });
//   it('updates the innerHTML of element with id "msg"', function() {
//     expect(document.getElementById("msg").innerHTML).to.equal("Hello, World!");
//     updateMsg("The new msg!");
//     expect(document.getElementById("msg").innerHTML).to.equal("The new msg!");
//   });
// });
