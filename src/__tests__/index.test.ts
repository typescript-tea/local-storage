import { JSDOM } from "jsdom";
import { createEffectManager } from "../index";

beforeAll(() => {
  //   globalThis.window = {
  //     ...globalThis.window,
  //     addEventListener: jest.fn(),
  //     removeEventListener: jest.fn(),
  //     navigator: { userAgent: "thisIsTheUserAgent" },
  //     location: { pathname: "thisIsThePathname" },
  //     // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //   } as any;

  const html = `
  <!doctype html>
<head>
  <meta charset="utf-8">
  <title>jsdom Unit Test</title>
</head>

<body>
  <p id='msg'>Hello, World!</p>
</body>
</html>
`;

  const dom = new JSDOM(html);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).window = dom.window;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).document = window.document;
});

afterAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).window = undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).document = undefined;
});

test("createEffectManager", () => {
  const map = createEffectManager();
  expect(Object.keys(map).length).toBe(5);
});

test("update message", () => {
  expect(document.getElementById("msg")!.innerHTML).toBe("Hello, World!");
  updateMsg("The new msg!");
  expect(document.getElementById("msg")!.innerHTML).toBe("The new msg!");
});

function updateMsg(newMsg: string): void {
  document.getElementById("msg")!.innerHTML = newMsg;
}

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
