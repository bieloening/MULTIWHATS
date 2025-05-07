"use strict";
/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunkmultiwhats"] = self["webpackChunkmultiwhats"] || []).push([["another"],{

/***/ "./src/frontend/another-module.tsx":
/*!*****************************************!*\
  !*** ./src/frontend/another-module.tsx ***!
  \*****************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

eval("\r\nvar __importDefault = (this && this.__importDefault) || function (mod) {\r\n    return (mod && mod.__esModule) ? mod : { \"default\": mod };\r\n};\r\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\r\nconst lodash_1 = __importDefault(__webpack_require__(/*! lodash */ \"./node_modules/lodash/lodash.js\"));\r\nconsole.log(lodash_1.default.join(['Another', 'module', 'loaded!'], ' '));\r\n\n\n//# sourceURL=webpack://multiwhats/./src/frontend/another-module.tsx?");

/***/ })

},
/******/ __webpack_require__ => { // webpackRuntimeModules
/******/ var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
/******/ __webpack_require__.O(0, ["vendors"], () => (__webpack_exec__("./src/frontend/another-module.tsx")));
/******/ var __webpack_exports__ = __webpack_require__.O();
/******/ }
]);