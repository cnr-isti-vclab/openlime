/******/ (function(modules) { // webpackBootstrap
/******/ 	function hotDisposeChunk(chunkId) {
/******/ 		delete installedChunks[chunkId];
/******/ 	}
/******/ 	var parentHotUpdateCallback = window["webpackHotUpdate"];
/******/ 	window["webpackHotUpdate"] = // eslint-disable-next-line no-unused-vars
/******/ 	function webpackHotUpdateCallback(chunkId, moreModules) {
/******/ 		hotAddUpdateChunk(chunkId, moreModules);
/******/ 		if (parentHotUpdateCallback) parentHotUpdateCallback(chunkId, moreModules);
/******/ 	} ;
/******/
/******/ 	// eslint-disable-next-line no-unused-vars
/******/ 	function hotDownloadUpdateChunk(chunkId) {
/******/ 		var script = document.createElement("script");
/******/ 		script.charset = "utf-8";
/******/ 		script.src = __webpack_require__.p + "" + chunkId + "." + hotCurrentHash + ".hot-update.js";
/******/ 		if (null) script.crossOrigin = null;
/******/ 		document.head.appendChild(script);
/******/ 	}
/******/
/******/ 	// eslint-disable-next-line no-unused-vars
/******/ 	function hotDownloadManifest(requestTimeout) {
/******/ 		requestTimeout = requestTimeout || 10000;
/******/ 		return new Promise(function(resolve, reject) {
/******/ 			if (typeof XMLHttpRequest === "undefined") {
/******/ 				return reject(new Error("No browser support"));
/******/ 			}
/******/ 			try {
/******/ 				var request = new XMLHttpRequest();
/******/ 				var requestPath = __webpack_require__.p + "" + hotCurrentHash + ".hot-update.json";
/******/ 				request.open("GET", requestPath, true);
/******/ 				request.timeout = requestTimeout;
/******/ 				request.send(null);
/******/ 			} catch (err) {
/******/ 				return reject(err);
/******/ 			}
/******/ 			request.onreadystatechange = function() {
/******/ 				if (request.readyState !== 4) return;
/******/ 				if (request.status === 0) {
/******/ 					// timeout
/******/ 					reject(
/******/ 						new Error("Manifest request to " + requestPath + " timed out.")
/******/ 					);
/******/ 				} else if (request.status === 404) {
/******/ 					// no update available
/******/ 					resolve();
/******/ 				} else if (request.status !== 200 && request.status !== 304) {
/******/ 					// other failure
/******/ 					reject(new Error("Manifest request to " + requestPath + " failed."));
/******/ 				} else {
/******/ 					// success
/******/ 					try {
/******/ 						var update = JSON.parse(request.responseText);
/******/ 					} catch (e) {
/******/ 						reject(e);
/******/ 						return;
/******/ 					}
/******/ 					resolve(update);
/******/ 				}
/******/ 			};
/******/ 		});
/******/ 	}
/******/
/******/ 	var hotApplyOnUpdate = true;
/******/ 	// eslint-disable-next-line no-unused-vars
/******/ 	var hotCurrentHash = "55aea8d0ee4855542a02";
/******/ 	var hotRequestTimeout = 10000;
/******/ 	var hotCurrentModuleData = {};
/******/ 	var hotCurrentChildModule;
/******/ 	// eslint-disable-next-line no-unused-vars
/******/ 	var hotCurrentParents = [];
/******/ 	// eslint-disable-next-line no-unused-vars
/******/ 	var hotCurrentParentsTemp = [];
/******/
/******/ 	// eslint-disable-next-line no-unused-vars
/******/ 	function hotCreateRequire(moduleId) {
/******/ 		var me = installedModules[moduleId];
/******/ 		if (!me) return __webpack_require__;
/******/ 		var fn = function(request) {
/******/ 			if (me.hot.active) {
/******/ 				if (installedModules[request]) {
/******/ 					if (installedModules[request].parents.indexOf(moduleId) === -1) {
/******/ 						installedModules[request].parents.push(moduleId);
/******/ 					}
/******/ 				} else {
/******/ 					hotCurrentParents = [moduleId];
/******/ 					hotCurrentChildModule = request;
/******/ 				}
/******/ 				if (me.children.indexOf(request) === -1) {
/******/ 					me.children.push(request);
/******/ 				}
/******/ 			} else {
/******/ 				console.warn(
/******/ 					"[HMR] unexpected require(" +
/******/ 						request +
/******/ 						") from disposed module " +
/******/ 						moduleId
/******/ 				);
/******/ 				hotCurrentParents = [];
/******/ 			}
/******/ 			return __webpack_require__(request);
/******/ 		};
/******/ 		var ObjectFactory = function ObjectFactory(name) {
/******/ 			return {
/******/ 				configurable: true,
/******/ 				enumerable: true,
/******/ 				get: function() {
/******/ 					return __webpack_require__[name];
/******/ 				},
/******/ 				set: function(value) {
/******/ 					__webpack_require__[name] = value;
/******/ 				}
/******/ 			};
/******/ 		};
/******/ 		for (var name in __webpack_require__) {
/******/ 			if (
/******/ 				Object.prototype.hasOwnProperty.call(__webpack_require__, name) &&
/******/ 				name !== "e" &&
/******/ 				name !== "t"
/******/ 			) {
/******/ 				Object.defineProperty(fn, name, ObjectFactory(name));
/******/ 			}
/******/ 		}
/******/ 		fn.e = function(chunkId) {
/******/ 			if (hotStatus === "ready") hotSetStatus("prepare");
/******/ 			hotChunksLoading++;
/******/ 			return __webpack_require__.e(chunkId).then(finishChunkLoading, function(err) {
/******/ 				finishChunkLoading();
/******/ 				throw err;
/******/ 			});
/******/
/******/ 			function finishChunkLoading() {
/******/ 				hotChunksLoading--;
/******/ 				if (hotStatus === "prepare") {
/******/ 					if (!hotWaitingFilesMap[chunkId]) {
/******/ 						hotEnsureUpdateChunk(chunkId);
/******/ 					}
/******/ 					if (hotChunksLoading === 0 && hotWaitingFiles === 0) {
/******/ 						hotUpdateDownloaded();
/******/ 					}
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 		fn.t = function(value, mode) {
/******/ 			if (mode & 1) value = fn(value);
/******/ 			return __webpack_require__.t(value, mode & ~1);
/******/ 		};
/******/ 		return fn;
/******/ 	}
/******/
/******/ 	// eslint-disable-next-line no-unused-vars
/******/ 	function hotCreateModule(moduleId) {
/******/ 		var hot = {
/******/ 			// private stuff
/******/ 			_acceptedDependencies: {},
/******/ 			_declinedDependencies: {},
/******/ 			_selfAccepted: false,
/******/ 			_selfDeclined: false,
/******/ 			_selfInvalidated: false,
/******/ 			_disposeHandlers: [],
/******/ 			_main: hotCurrentChildModule !== moduleId,
/******/
/******/ 			// Module API
/******/ 			active: true,
/******/ 			accept: function(dep, callback) {
/******/ 				if (dep === undefined) hot._selfAccepted = true;
/******/ 				else if (typeof dep === "function") hot._selfAccepted = dep;
/******/ 				else if (typeof dep === "object")
/******/ 					for (var i = 0; i < dep.length; i++)
/******/ 						hot._acceptedDependencies[dep[i]] = callback || function() {};
/******/ 				else hot._acceptedDependencies[dep] = callback || function() {};
/******/ 			},
/******/ 			decline: function(dep) {
/******/ 				if (dep === undefined) hot._selfDeclined = true;
/******/ 				else if (typeof dep === "object")
/******/ 					for (var i = 0; i < dep.length; i++)
/******/ 						hot._declinedDependencies[dep[i]] = true;
/******/ 				else hot._declinedDependencies[dep] = true;
/******/ 			},
/******/ 			dispose: function(callback) {
/******/ 				hot._disposeHandlers.push(callback);
/******/ 			},
/******/ 			addDisposeHandler: function(callback) {
/******/ 				hot._disposeHandlers.push(callback);
/******/ 			},
/******/ 			removeDisposeHandler: function(callback) {
/******/ 				var idx = hot._disposeHandlers.indexOf(callback);
/******/ 				if (idx >= 0) hot._disposeHandlers.splice(idx, 1);
/******/ 			},
/******/ 			invalidate: function() {
/******/ 				this._selfInvalidated = true;
/******/ 				switch (hotStatus) {
/******/ 					case "idle":
/******/ 						hotUpdate = {};
/******/ 						hotUpdate[moduleId] = modules[moduleId];
/******/ 						hotSetStatus("ready");
/******/ 						break;
/******/ 					case "ready":
/******/ 						hotApplyInvalidatedModule(moduleId);
/******/ 						break;
/******/ 					case "prepare":
/******/ 					case "check":
/******/ 					case "dispose":
/******/ 					case "apply":
/******/ 						(hotQueuedInvalidatedModules =
/******/ 							hotQueuedInvalidatedModules || []).push(moduleId);
/******/ 						break;
/******/ 					default:
/******/ 						// ignore requests in error states
/******/ 						break;
/******/ 				}
/******/ 			},
/******/
/******/ 			// Management API
/******/ 			check: hotCheck,
/******/ 			apply: hotApply,
/******/ 			status: function(l) {
/******/ 				if (!l) return hotStatus;
/******/ 				hotStatusHandlers.push(l);
/******/ 			},
/******/ 			addStatusHandler: function(l) {
/******/ 				hotStatusHandlers.push(l);
/******/ 			},
/******/ 			removeStatusHandler: function(l) {
/******/ 				var idx = hotStatusHandlers.indexOf(l);
/******/ 				if (idx >= 0) hotStatusHandlers.splice(idx, 1);
/******/ 			},
/******/
/******/ 			//inherit from previous dispose call
/******/ 			data: hotCurrentModuleData[moduleId]
/******/ 		};
/******/ 		hotCurrentChildModule = undefined;
/******/ 		return hot;
/******/ 	}
/******/
/******/ 	var hotStatusHandlers = [];
/******/ 	var hotStatus = "idle";
/******/
/******/ 	function hotSetStatus(newStatus) {
/******/ 		hotStatus = newStatus;
/******/ 		for (var i = 0; i < hotStatusHandlers.length; i++)
/******/ 			hotStatusHandlers[i].call(null, newStatus);
/******/ 	}
/******/
/******/ 	// while downloading
/******/ 	var hotWaitingFiles = 0;
/******/ 	var hotChunksLoading = 0;
/******/ 	var hotWaitingFilesMap = {};
/******/ 	var hotRequestedFilesMap = {};
/******/ 	var hotAvailableFilesMap = {};
/******/ 	var hotDeferred;
/******/
/******/ 	// The update info
/******/ 	var hotUpdate, hotUpdateNewHash, hotQueuedInvalidatedModules;
/******/
/******/ 	function toModuleId(id) {
/******/ 		var isNumber = +id + "" === id;
/******/ 		return isNumber ? +id : id;
/******/ 	}
/******/
/******/ 	function hotCheck(apply) {
/******/ 		if (hotStatus !== "idle") {
/******/ 			throw new Error("check() is only allowed in idle status");
/******/ 		}
/******/ 		hotApplyOnUpdate = apply;
/******/ 		hotSetStatus("check");
/******/ 		return hotDownloadManifest(hotRequestTimeout).then(function(update) {
/******/ 			if (!update) {
/******/ 				hotSetStatus(hotApplyInvalidatedModules() ? "ready" : "idle");
/******/ 				return null;
/******/ 			}
/******/ 			hotRequestedFilesMap = {};
/******/ 			hotWaitingFilesMap = {};
/******/ 			hotAvailableFilesMap = update.c;
/******/ 			hotUpdateNewHash = update.h;
/******/
/******/ 			hotSetStatus("prepare");
/******/ 			var promise = new Promise(function(resolve, reject) {
/******/ 				hotDeferred = {
/******/ 					resolve: resolve,
/******/ 					reject: reject
/******/ 				};
/******/ 			});
/******/ 			hotUpdate = {};
/******/ 			var chunkId = "main";
/******/ 			// eslint-disable-next-line no-lone-blocks
/******/ 			{
/******/ 				hotEnsureUpdateChunk(chunkId);
/******/ 			}
/******/ 			if (
/******/ 				hotStatus === "prepare" &&
/******/ 				hotChunksLoading === 0 &&
/******/ 				hotWaitingFiles === 0
/******/ 			) {
/******/ 				hotUpdateDownloaded();
/******/ 			}
/******/ 			return promise;
/******/ 		});
/******/ 	}
/******/
/******/ 	// eslint-disable-next-line no-unused-vars
/******/ 	function hotAddUpdateChunk(chunkId, moreModules) {
/******/ 		if (!hotAvailableFilesMap[chunkId] || !hotRequestedFilesMap[chunkId])
/******/ 			return;
/******/ 		hotRequestedFilesMap[chunkId] = false;
/******/ 		for (var moduleId in moreModules) {
/******/ 			if (Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
/******/ 				hotUpdate[moduleId] = moreModules[moduleId];
/******/ 			}
/******/ 		}
/******/ 		if (--hotWaitingFiles === 0 && hotChunksLoading === 0) {
/******/ 			hotUpdateDownloaded();
/******/ 		}
/******/ 	}
/******/
/******/ 	function hotEnsureUpdateChunk(chunkId) {
/******/ 		if (!hotAvailableFilesMap[chunkId]) {
/******/ 			hotWaitingFilesMap[chunkId] = true;
/******/ 		} else {
/******/ 			hotRequestedFilesMap[chunkId] = true;
/******/ 			hotWaitingFiles++;
/******/ 			hotDownloadUpdateChunk(chunkId);
/******/ 		}
/******/ 	}
/******/
/******/ 	function hotUpdateDownloaded() {
/******/ 		hotSetStatus("ready");
/******/ 		var deferred = hotDeferred;
/******/ 		hotDeferred = null;
/******/ 		if (!deferred) return;
/******/ 		if (hotApplyOnUpdate) {
/******/ 			// Wrap deferred object in Promise to mark it as a well-handled Promise to
/******/ 			// avoid triggering uncaught exception warning in Chrome.
/******/ 			// See https://bugs.chromium.org/p/chromium/issues/detail?id=465666
/******/ 			Promise.resolve()
/******/ 				.then(function() {
/******/ 					return hotApply(hotApplyOnUpdate);
/******/ 				})
/******/ 				.then(
/******/ 					function(result) {
/******/ 						deferred.resolve(result);
/******/ 					},
/******/ 					function(err) {
/******/ 						deferred.reject(err);
/******/ 					}
/******/ 				);
/******/ 		} else {
/******/ 			var outdatedModules = [];
/******/ 			for (var id in hotUpdate) {
/******/ 				if (Object.prototype.hasOwnProperty.call(hotUpdate, id)) {
/******/ 					outdatedModules.push(toModuleId(id));
/******/ 				}
/******/ 			}
/******/ 			deferred.resolve(outdatedModules);
/******/ 		}
/******/ 	}
/******/
/******/ 	function hotApply(options) {
/******/ 		if (hotStatus !== "ready")
/******/ 			throw new Error("apply() is only allowed in ready status");
/******/ 		options = options || {};
/******/ 		return hotApplyInternal(options);
/******/ 	}
/******/
/******/ 	function hotApplyInternal(options) {
/******/ 		hotApplyInvalidatedModules();
/******/
/******/ 		var cb;
/******/ 		var i;
/******/ 		var j;
/******/ 		var module;
/******/ 		var moduleId;
/******/
/******/ 		function getAffectedStuff(updateModuleId) {
/******/ 			var outdatedModules = [updateModuleId];
/******/ 			var outdatedDependencies = {};
/******/
/******/ 			var queue = outdatedModules.map(function(id) {
/******/ 				return {
/******/ 					chain: [id],
/******/ 					id: id
/******/ 				};
/******/ 			});
/******/ 			while (queue.length > 0) {
/******/ 				var queueItem = queue.pop();
/******/ 				var moduleId = queueItem.id;
/******/ 				var chain = queueItem.chain;
/******/ 				module = installedModules[moduleId];
/******/ 				if (
/******/ 					!module ||
/******/ 					(module.hot._selfAccepted && !module.hot._selfInvalidated)
/******/ 				)
/******/ 					continue;
/******/ 				if (module.hot._selfDeclined) {
/******/ 					return {
/******/ 						type: "self-declined",
/******/ 						chain: chain,
/******/ 						moduleId: moduleId
/******/ 					};
/******/ 				}
/******/ 				if (module.hot._main) {
/******/ 					return {
/******/ 						type: "unaccepted",
/******/ 						chain: chain,
/******/ 						moduleId: moduleId
/******/ 					};
/******/ 				}
/******/ 				for (var i = 0; i < module.parents.length; i++) {
/******/ 					var parentId = module.parents[i];
/******/ 					var parent = installedModules[parentId];
/******/ 					if (!parent) continue;
/******/ 					if (parent.hot._declinedDependencies[moduleId]) {
/******/ 						return {
/******/ 							type: "declined",
/******/ 							chain: chain.concat([parentId]),
/******/ 							moduleId: moduleId,
/******/ 							parentId: parentId
/******/ 						};
/******/ 					}
/******/ 					if (outdatedModules.indexOf(parentId) !== -1) continue;
/******/ 					if (parent.hot._acceptedDependencies[moduleId]) {
/******/ 						if (!outdatedDependencies[parentId])
/******/ 							outdatedDependencies[parentId] = [];
/******/ 						addAllToSet(outdatedDependencies[parentId], [moduleId]);
/******/ 						continue;
/******/ 					}
/******/ 					delete outdatedDependencies[parentId];
/******/ 					outdatedModules.push(parentId);
/******/ 					queue.push({
/******/ 						chain: chain.concat([parentId]),
/******/ 						id: parentId
/******/ 					});
/******/ 				}
/******/ 			}
/******/
/******/ 			return {
/******/ 				type: "accepted",
/******/ 				moduleId: updateModuleId,
/******/ 				outdatedModules: outdatedModules,
/******/ 				outdatedDependencies: outdatedDependencies
/******/ 			};
/******/ 		}
/******/
/******/ 		function addAllToSet(a, b) {
/******/ 			for (var i = 0; i < b.length; i++) {
/******/ 				var item = b[i];
/******/ 				if (a.indexOf(item) === -1) a.push(item);
/******/ 			}
/******/ 		}
/******/
/******/ 		// at begin all updates modules are outdated
/******/ 		// the "outdated" status can propagate to parents if they don't accept the children
/******/ 		var outdatedDependencies = {};
/******/ 		var outdatedModules = [];
/******/ 		var appliedUpdate = {};
/******/
/******/ 		var warnUnexpectedRequire = function warnUnexpectedRequire() {
/******/ 			console.warn(
/******/ 				"[HMR] unexpected require(" + result.moduleId + ") to disposed module"
/******/ 			);
/******/ 		};
/******/
/******/ 		for (var id in hotUpdate) {
/******/ 			if (Object.prototype.hasOwnProperty.call(hotUpdate, id)) {
/******/ 				moduleId = toModuleId(id);
/******/ 				/** @type {TODO} */
/******/ 				var result;
/******/ 				if (hotUpdate[id]) {
/******/ 					result = getAffectedStuff(moduleId);
/******/ 				} else {
/******/ 					result = {
/******/ 						type: "disposed",
/******/ 						moduleId: id
/******/ 					};
/******/ 				}
/******/ 				/** @type {Error|false} */
/******/ 				var abortError = false;
/******/ 				var doApply = false;
/******/ 				var doDispose = false;
/******/ 				var chainInfo = "";
/******/ 				if (result.chain) {
/******/ 					chainInfo = "\nUpdate propagation: " + result.chain.join(" -> ");
/******/ 				}
/******/ 				switch (result.type) {
/******/ 					case "self-declined":
/******/ 						if (options.onDeclined) options.onDeclined(result);
/******/ 						if (!options.ignoreDeclined)
/******/ 							abortError = new Error(
/******/ 								"Aborted because of self decline: " +
/******/ 									result.moduleId +
/******/ 									chainInfo
/******/ 							);
/******/ 						break;
/******/ 					case "declined":
/******/ 						if (options.onDeclined) options.onDeclined(result);
/******/ 						if (!options.ignoreDeclined)
/******/ 							abortError = new Error(
/******/ 								"Aborted because of declined dependency: " +
/******/ 									result.moduleId +
/******/ 									" in " +
/******/ 									result.parentId +
/******/ 									chainInfo
/******/ 							);
/******/ 						break;
/******/ 					case "unaccepted":
/******/ 						if (options.onUnaccepted) options.onUnaccepted(result);
/******/ 						if (!options.ignoreUnaccepted)
/******/ 							abortError = new Error(
/******/ 								"Aborted because " + moduleId + " is not accepted" + chainInfo
/******/ 							);
/******/ 						break;
/******/ 					case "accepted":
/******/ 						if (options.onAccepted) options.onAccepted(result);
/******/ 						doApply = true;
/******/ 						break;
/******/ 					case "disposed":
/******/ 						if (options.onDisposed) options.onDisposed(result);
/******/ 						doDispose = true;
/******/ 						break;
/******/ 					default:
/******/ 						throw new Error("Unexception type " + result.type);
/******/ 				}
/******/ 				if (abortError) {
/******/ 					hotSetStatus("abort");
/******/ 					return Promise.reject(abortError);
/******/ 				}
/******/ 				if (doApply) {
/******/ 					appliedUpdate[moduleId] = hotUpdate[moduleId];
/******/ 					addAllToSet(outdatedModules, result.outdatedModules);
/******/ 					for (moduleId in result.outdatedDependencies) {
/******/ 						if (
/******/ 							Object.prototype.hasOwnProperty.call(
/******/ 								result.outdatedDependencies,
/******/ 								moduleId
/******/ 							)
/******/ 						) {
/******/ 							if (!outdatedDependencies[moduleId])
/******/ 								outdatedDependencies[moduleId] = [];
/******/ 							addAllToSet(
/******/ 								outdatedDependencies[moduleId],
/******/ 								result.outdatedDependencies[moduleId]
/******/ 							);
/******/ 						}
/******/ 					}
/******/ 				}
/******/ 				if (doDispose) {
/******/ 					addAllToSet(outdatedModules, [result.moduleId]);
/******/ 					appliedUpdate[moduleId] = warnUnexpectedRequire;
/******/ 				}
/******/ 			}
/******/ 		}
/******/
/******/ 		// Store self accepted outdated modules to require them later by the module system
/******/ 		var outdatedSelfAcceptedModules = [];
/******/ 		for (i = 0; i < outdatedModules.length; i++) {
/******/ 			moduleId = outdatedModules[i];
/******/ 			if (
/******/ 				installedModules[moduleId] &&
/******/ 				installedModules[moduleId].hot._selfAccepted &&
/******/ 				// removed self-accepted modules should not be required
/******/ 				appliedUpdate[moduleId] !== warnUnexpectedRequire &&
/******/ 				// when called invalidate self-accepting is not possible
/******/ 				!installedModules[moduleId].hot._selfInvalidated
/******/ 			) {
/******/ 				outdatedSelfAcceptedModules.push({
/******/ 					module: moduleId,
/******/ 					parents: installedModules[moduleId].parents.slice(),
/******/ 					errorHandler: installedModules[moduleId].hot._selfAccepted
/******/ 				});
/******/ 			}
/******/ 		}
/******/
/******/ 		// Now in "dispose" phase
/******/ 		hotSetStatus("dispose");
/******/ 		Object.keys(hotAvailableFilesMap).forEach(function(chunkId) {
/******/ 			if (hotAvailableFilesMap[chunkId] === false) {
/******/ 				hotDisposeChunk(chunkId);
/******/ 			}
/******/ 		});
/******/
/******/ 		var idx;
/******/ 		var queue = outdatedModules.slice();
/******/ 		while (queue.length > 0) {
/******/ 			moduleId = queue.pop();
/******/ 			module = installedModules[moduleId];
/******/ 			if (!module) continue;
/******/
/******/ 			var data = {};
/******/
/******/ 			// Call dispose handlers
/******/ 			var disposeHandlers = module.hot._disposeHandlers;
/******/ 			for (j = 0; j < disposeHandlers.length; j++) {
/******/ 				cb = disposeHandlers[j];
/******/ 				cb(data);
/******/ 			}
/******/ 			hotCurrentModuleData[moduleId] = data;
/******/
/******/ 			// disable module (this disables requires from this module)
/******/ 			module.hot.active = false;
/******/
/******/ 			// remove module from cache
/******/ 			delete installedModules[moduleId];
/******/
/******/ 			// when disposing there is no need to call dispose handler
/******/ 			delete outdatedDependencies[moduleId];
/******/
/******/ 			// remove "parents" references from all children
/******/ 			for (j = 0; j < module.children.length; j++) {
/******/ 				var child = installedModules[module.children[j]];
/******/ 				if (!child) continue;
/******/ 				idx = child.parents.indexOf(moduleId);
/******/ 				if (idx >= 0) {
/******/ 					child.parents.splice(idx, 1);
/******/ 				}
/******/ 			}
/******/ 		}
/******/
/******/ 		// remove outdated dependency from module children
/******/ 		var dependency;
/******/ 		var moduleOutdatedDependencies;
/******/ 		for (moduleId in outdatedDependencies) {
/******/ 			if (
/******/ 				Object.prototype.hasOwnProperty.call(outdatedDependencies, moduleId)
/******/ 			) {
/******/ 				module = installedModules[moduleId];
/******/ 				if (module) {
/******/ 					moduleOutdatedDependencies = outdatedDependencies[moduleId];
/******/ 					for (j = 0; j < moduleOutdatedDependencies.length; j++) {
/******/ 						dependency = moduleOutdatedDependencies[j];
/******/ 						idx = module.children.indexOf(dependency);
/******/ 						if (idx >= 0) module.children.splice(idx, 1);
/******/ 					}
/******/ 				}
/******/ 			}
/******/ 		}
/******/
/******/ 		// Now in "apply" phase
/******/ 		hotSetStatus("apply");
/******/
/******/ 		if (hotUpdateNewHash !== undefined) {
/******/ 			hotCurrentHash = hotUpdateNewHash;
/******/ 			hotUpdateNewHash = undefined;
/******/ 		}
/******/ 		hotUpdate = undefined;
/******/
/******/ 		// insert new code
/******/ 		for (moduleId in appliedUpdate) {
/******/ 			if (Object.prototype.hasOwnProperty.call(appliedUpdate, moduleId)) {
/******/ 				modules[moduleId] = appliedUpdate[moduleId];
/******/ 			}
/******/ 		}
/******/
/******/ 		// call accept handlers
/******/ 		var error = null;
/******/ 		for (moduleId in outdatedDependencies) {
/******/ 			if (
/******/ 				Object.prototype.hasOwnProperty.call(outdatedDependencies, moduleId)
/******/ 			) {
/******/ 				module = installedModules[moduleId];
/******/ 				if (module) {
/******/ 					moduleOutdatedDependencies = outdatedDependencies[moduleId];
/******/ 					var callbacks = [];
/******/ 					for (i = 0; i < moduleOutdatedDependencies.length; i++) {
/******/ 						dependency = moduleOutdatedDependencies[i];
/******/ 						cb = module.hot._acceptedDependencies[dependency];
/******/ 						if (cb) {
/******/ 							if (callbacks.indexOf(cb) !== -1) continue;
/******/ 							callbacks.push(cb);
/******/ 						}
/******/ 					}
/******/ 					for (i = 0; i < callbacks.length; i++) {
/******/ 						cb = callbacks[i];
/******/ 						try {
/******/ 							cb(moduleOutdatedDependencies);
/******/ 						} catch (err) {
/******/ 							if (options.onErrored) {
/******/ 								options.onErrored({
/******/ 									type: "accept-errored",
/******/ 									moduleId: moduleId,
/******/ 									dependencyId: moduleOutdatedDependencies[i],
/******/ 									error: err
/******/ 								});
/******/ 							}
/******/ 							if (!options.ignoreErrored) {
/******/ 								if (!error) error = err;
/******/ 							}
/******/ 						}
/******/ 					}
/******/ 				}
/******/ 			}
/******/ 		}
/******/
/******/ 		// Load self accepted modules
/******/ 		for (i = 0; i < outdatedSelfAcceptedModules.length; i++) {
/******/ 			var item = outdatedSelfAcceptedModules[i];
/******/ 			moduleId = item.module;
/******/ 			hotCurrentParents = item.parents;
/******/ 			hotCurrentChildModule = moduleId;
/******/ 			try {
/******/ 				__webpack_require__(moduleId);
/******/ 			} catch (err) {
/******/ 				if (typeof item.errorHandler === "function") {
/******/ 					try {
/******/ 						item.errorHandler(err);
/******/ 					} catch (err2) {
/******/ 						if (options.onErrored) {
/******/ 							options.onErrored({
/******/ 								type: "self-accept-error-handler-errored",
/******/ 								moduleId: moduleId,
/******/ 								error: err2,
/******/ 								originalError: err
/******/ 							});
/******/ 						}
/******/ 						if (!options.ignoreErrored) {
/******/ 							if (!error) error = err2;
/******/ 						}
/******/ 						if (!error) error = err;
/******/ 					}
/******/ 				} else {
/******/ 					if (options.onErrored) {
/******/ 						options.onErrored({
/******/ 							type: "self-accept-errored",
/******/ 							moduleId: moduleId,
/******/ 							error: err
/******/ 						});
/******/ 					}
/******/ 					if (!options.ignoreErrored) {
/******/ 						if (!error) error = err;
/******/ 					}
/******/ 				}
/******/ 			}
/******/ 		}
/******/
/******/ 		// handle errors in accept handlers and self accepted module load
/******/ 		if (error) {
/******/ 			hotSetStatus("fail");
/******/ 			return Promise.reject(error);
/******/ 		}
/******/
/******/ 		if (hotQueuedInvalidatedModules) {
/******/ 			return hotApplyInternal(options).then(function(list) {
/******/ 				outdatedModules.forEach(function(moduleId) {
/******/ 					if (list.indexOf(moduleId) < 0) list.push(moduleId);
/******/ 				});
/******/ 				return list;
/******/ 			});
/******/ 		}
/******/
/******/ 		hotSetStatus("idle");
/******/ 		return new Promise(function(resolve) {
/******/ 			resolve(outdatedModules);
/******/ 		});
/******/ 	}
/******/
/******/ 	function hotApplyInvalidatedModules() {
/******/ 		if (hotQueuedInvalidatedModules) {
/******/ 			if (!hotUpdate) hotUpdate = {};
/******/ 			hotQueuedInvalidatedModules.forEach(hotApplyInvalidatedModule);
/******/ 			hotQueuedInvalidatedModules = undefined;
/******/ 			return true;
/******/ 		}
/******/ 	}
/******/
/******/ 	function hotApplyInvalidatedModule(moduleId) {
/******/ 		if (!Object.prototype.hasOwnProperty.call(hotUpdate, moduleId))
/******/ 			hotUpdate[moduleId] = modules[moduleId];
/******/ 	}
/******/
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {},
/******/ 			hot: hotCreateModule(moduleId),
/******/ 			parents: (hotCurrentParentsTemp = hotCurrentParents, hotCurrentParents = [], hotCurrentParentsTemp),
/******/ 			children: []
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, hotCreateRequire(moduleId));
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// __webpack_hash__
/******/ 	__webpack_require__.h = function() { return hotCurrentHash; };
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return hotCreateRequire("./src/index.js")(__webpack_require__.s = "./src/index.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/Camera.js":
/*!***********************!*\
  !*** ./src/Camera.js ***!
  \***********************/
/*! exports provided: Camera */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"Camera\", function() { return Camera; });\n/* harmony import */ var _Transform_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Transform.js */ \"./src/Transform.js\");\n\n\n/**\n * @param {object} options\n * * *bounded*: limit translation of the camera to the boundary of the scene.\n * * *maxZoom*: maximum zoom, 1:maxZoom is screen pixel to image pixel ratio.\n */\n\nclass Camera {\n\n\tconstructor(options) {\n\t\tObject.assign(this, {\n\t\t\tbounded: true,\n\t\t\tmaxZoom: 4,\n\t\t\tminZoom: 'full'\n\t\t});\n\t\tObject.assign(this, options);\n\t\tthis.target = new _Transform_js__WEBPACK_IMPORTED_MODULE_0__[\"Transform\"](this.target);\n\t\tthis.source = this.target.copy();\n\t\tconsole.log(this.target, this.source);\n\t}\n\n\tgetCurrentTransform(time) {\n\t\tif(time < this.target.source)\n\t\t\treturn this.source;\n\t\tif(time > this.target.t)\n\t\t\treturn this.target;\n\n\t\tlet pos = new _Transform_js__WEBPACK_IMPORTED_MODULE_0__[\"Transform\"]();\n\t\tpos.interpolate(this.source, this.target, time);\n\t\treturn pos;\n\t}\n}\n\n\n\n\n//# sourceURL=webpack:///./src/Camera.js?");

/***/ }),

/***/ "./src/Canvas.js":
/*!***********************!*\
  !*** ./src/Canvas.js ***!
  \***********************/
/*! exports provided: Canvas */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"Canvas\", function() { return Canvas; });\n/* harmony import */ var _Camera_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Camera.js */ \"./src/Camera.js\");\n\n\nclass Canvas {\n\tconstructor(canvas, overlay, options) {\n\t\tlet initial = \n\t\tObject.assign(this, { \n\t\t\tpreserveDrawingBuffer: false, \n\t\t\tviewport: [0, 0, 0, 0], \n\t\t\tgl: null \n\t\t});\n\n\t\tif(options)\n\t\t\tObject.assign(this, options);\n\n\t\tthis.camera = new _Camera_js__WEBPACK_IMPORTED_MODULE_0__[\"Camera\"](this.camera);\n\n\t\tthis.initElement(canvas);\n\t\t\n\t}\n\n\tresize(width, height) {\n\t\tthis.canvas.width = width;\n\t\tthis.canvas.height = height;\n\n//\t\tthis.layers.forEach((layer) => { layer.prefetch(); });\n\t\tthis.redraw();\n\t}\n\n\tinitElement(canvas) {\n\t\tif(!canvas)\n\t\t\tthrow \"Missing element parameter\"\n\n\t\tif(typeof(canvas) == 'string') {\n\t\t\tcanvas = document.querySelector(canvas);\n\t\t\tif(!canvas)\n\t\t\t\tthrow \"Could not find dom element.\";\n\t\t}\n\n\t\tif(!canvas.tagName)\n\t\t\tthrow \"Element is not a DOM element\"\n\n\t\tif(canvas.tagName != \"CANVAS\")\n\t\t\tthrow \"Element is not a canvas element\";\n\n\n\t\tlet glopt = { antialias: false, depth: false, preserveDrawingBuffer: this.preserveDrawingBuffer };\n\t\tthis.gl = this.gl || \n\t\t\tcanvas.getContext(\"webgl2\", glopt) || \n\t\t\tcanvas.getContext(\"webgl\", glopt) || \n\t\t\tcanvas.getContext(\"experimental-webgl\", glopt) ;\n\n\t\tif (!this.gl)\n\t\t\tthrow \"Could not create a WebGL context\";\n\n\t\tthis.canvas = canvas;\n\t}\n\n\tdraw(time) {\n\t\tlet pos = this.camera.getCurrentTransform(time);\n\t\tconsole.log(pos);\n\t\treturn pos.t == this.camera.target.t;\n\t}\n}\n\n\n\n\n//# sourceURL=webpack:///./src/Canvas.js?");

/***/ }),

/***/ "./src/OpenLIME.js":
/*!*************************!*\
  !*** ./src/OpenLIME.js ***!
  \*************************/
/*! exports provided: OpenLIME */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"OpenLIME\", function() { return OpenLIME; });\n/* harmony import */ var _Canvas_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Canvas.js */ \"./src/Canvas.js\");\n\n\n/**\n * Manages an OpenLIME viewer functionality on a canvas\n * how do I write more substantial documentation.\n *\n * @param {element} element of the DOM or selector (es. '#canvasid'), or a canvas.\n * @param {string} options is a url to a JSON describing the viewer content\n * @param {object} options is a JSON describing the viewer content\n *  * **animate**: default *true*, calls requestAnimation() and manages refresh.\n *  * test:\n */\n\nclass OpenLIME {\n\n\tconstructor(element, options) {\n\t\tif(typeof(element) == 'string')\n\t\t\telement = document. querySelector(element);\n\n\t\tif(!element)\n\t\t\tthrow \"Missing element parameter\";\n\n\t\tthis.containerElement = element;\n\t\tthis.canvasElement = element.querySelector('canvas');\n\t\tif(!this.canvasElement) {\n\t\t\tthis.canvasElement = document.createElement('canvas');\n\t\t\telement.appendChild(this.canvasElement);\n\t\t}\n\t\tthis.canvasElement.addEventListener('resize', (e) => this.resize());\n\n\t\tObject.assign(this, { background: [0, 0, 0, 1] });\n\n\t\tthis.canvas = new _Canvas_js__WEBPACK_IMPORTED_MODULE_0__[\"Canvas\"](this.canvasElement, this.canvas);\n\t}\n\n\t/**\n\t* Resize the canvas (and the overlay) and triggers a redraw.\n\t*/\n\tresize(event) {\n\t\tconsole.log(event);\n\t\tredraw();\n\t}\n\n\t/**\n\t*\n\t* Schedule a drawing.\n\t*/\n\tredraw() {\n\t\tif(this.animaterequest) return;\n\t\tthis.animaterequest = requestAnimationFrame( (time) => { this.draw(time); });\n\t}\n\n\t/**\n\t* Do not call this if OpenLIME is animating, use redraw()\n\t* @param {time} time as in performance.now()\n\t*/\n\tdraw(time) {\n\t\tconsole.log('drawing');\n\t\tif(!time) time = performance.now();\n\t\tthis.animaterequest = null;\n\n\t\tlet gl = this.canvas.gl;\n\t\tgl.viewport(0, 0, this.canvas.width, this.canvas.height);\n\t\tvar b = this.background;\n\t\tgl.clearColor(b[0], b[1], b[2], b[3], b[4]);\n\t\tgl.clear(gl.COLOR_BUFFER_BIT);\n\n\t\tlet done = this.canvas.draw(time);\n\t\tif(!done)\n\t\t\tthis.redraw();\n\t}\n}\n\n\n\n\n\n//# sourceURL=webpack:///./src/OpenLIME.js?");

/***/ }),

/***/ "./src/Raster.js":
/*!***********************!*\
  !*** ./src/Raster.js ***!
  \***********************/
/*! exports provided: Raster */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"Raster\", function() { return Raster; });\n/**\n * Raster is a providers of images and planes of coefficies.\n * It support all files format supported by browser and a set of tiled formats.\n *\n * Layout can be:\n * * image: a single image (.jpg, .png etc.)\n * * google: there is no config file, so layout, suffix is mandatory if not .jpg,  and url is the base folder of the tiles.\n * * deepzoom: requires only url, can be autodetected from the extension (.dzi)\n * * zoomify: requires url, can be autodetected, from the ImageProperties.xml, suffix is required if not .jpg\n * * iip: requires url, can be autodetected from the url\n * * iiif: layout is mandatory, url should point to base url {scheme}://{server}{/prefix}/{identifier}\n *\n * @param {string} id an unique id for each raster\n * @param {url} url of the content\n * @param {object} options \n * * *layout*: <image|google|deepzoom|zoomify|iip|iiif> default is image.\n * * *type*: rgb (default value) for standard images, rgba when including alpha, grayscale8,  grayscale16 for other purpouses.\n * * *attribute*: <color|kd|ks|gloss|normals|dem> meaning of the image.\n * * *colorSpace*: <linear|srgb> colorspace used for rendering.\n */\n\nclass Raster {\n\n\tconstructor(id, url, options) {\n\t\tif(!id)\n\t\t\tthrow \"Missing id argument\";\n\t\tif(!url)\n\t\t\tthrow \"Missing url argument\";\n\n\t\tthis.id = id;\n\t\tthis.url = url;\n\n\t\tObject.assign(this, { \n\t\t\twidth: 0, height: 0, layout: 'image', suffix: 'jpg', \n\t\t\ttilesize: 0, overlap: 0, nlevels: 0,\n\t\t\ttype: 'rgb', colorSpace: 'srgb',\n\t\t\tstatus: 'loading',\n\t\t\tready: []\n\t\t });\n\n\t\tif(options) {\n\t\t\tif(typeof(options.ready) == 'function')\n\t\t\t\toptions.ready = [options.ready];\n\n\t\t\tObject.assign(this, options);\n\t\t}\n\n\t\tswitch(this.layout) {\n\t\t\tcase 'image':    this.status = 'ready'; this.emit('ready'); break;\n\t\t\tcase 'google':   this.initGoogle(); break;\n\t\t\tcase 'deepzoom': this.initDeepzoom(); break;\n\t\t}\n\t}\n\n\temit(event) {\n\t\tfor(let callback of this[event])\n\t\t\tcallback(this);\n\t}\n\n\n/**\n *  url points to the folder (without /)\n *  width and height must be defined\n */\n\tinitGoogle() {\n\t\tif(!this.width || !this.height)\n\t\t\tthrow \"Google rasters require to specify width and height\";\n\n\t\tthis.tilesize = 256;\n\t\tthis.overlap = 0;\n\n\t\tlet max = Math.max(this.width, this.height)/this.tilesize;\n\t\tthis.nlevels = Math.ceil(Math.log(max) / Math.LN2) + 1;\n\n\t\tthis.getTileURL = (x, y, level) => {\n\t\t\tvar ilevel = parseInt(this.nlevels - 1 - level);\n\t\t\treturn this.url + \"/\" + ilevel + \"/\" + y + \"/\" + x + '.' + this.suffix;\n\t\t};\n\t\tthis.status = 'ready';\n\t\tthis.emit('ready');\n\t}\n\n\n/**\n * Expects the url to point to .dzi config file\n */\n\tinitDeepzoom() {\n\t\t(async () => {\n\t\t\tvar response = await fetch(this.url);\n\t\t\tif(!response.ok) {\n\t\t\t\tthis.status = \"Failed loading \" + this.url + \": \" + response.statusText;\n\t\t\t\treturn;\n\t\t\t}\n\t\t\tlet text = await response.text();\n\t\t\tlet xml = (new window.DOMParser()).parseFromString(text, \"text/xml\");\n\n\t\t\tlet doc = xml.documentElement;\n\t\t\tthis.suffix = doc.getAttribute('Format');\n\t\t\tthis.tilesize = doc.getAttribute('TileSize');\n\t\t\tthis.overlap = doc.getAttribute('Overlap');\n\n\t\t\tlet size = doc.querySelector('Size');\n\t\t\tthis.width = size.getAttribute('Width');\n\t\t\tthis.height = size.getAttribute('Height');\n\n\t\t\tlet max = Math.max(this.width, this.height)/this.tilesize;\n\t\t\tthis.nlevels = Math.ceil(Math.log(max) / Math.LN2) + 1;\n\n\t\t\tthis.url = this.url.substr(0, this.url.lastIndexOf(\".\")) + '_files/';\n\n\t\t\tthis.getTileURL = (x, y, level) => {\n\t\t\t\tlet ilevel = parseInt(this.nlevels - 1 - level);\n\t\t\t\treturn this.url + ilevel + '/' + x + '_' + y + '.' + this.suffix;\n\t\t\t}; \n\n\t\t\tthis.status = 'ready';\n\t\t\tthis.emit('ready');\n\n\t\t})().catch(e => { console.log(e); this.status = e; });\n\t}\n\n\n/**\n * Expects the url to point to ImageProperties.xml file.\n */\n\tinitZoomify() {\n\t\tt.overlap = 0;\n\t\t(async () => {\n\t\t\tvar response = await fetch(this.url);\n\t\t\tif(!response.ok) {\n\t\t\t\tthis.status = \"Failed loading \" + this.url + \": \" + response.statusText;\n\t\t\t\treturn;\n\t\t\t}\n\t\t\tlet text = await response.text();\n\n\t\t\tlet tmp = response.split('\"');\n\t\t\tthis.tilesize = parseInt(tmp[11]);\n\n\t\t\tlet max = Math.max(t.width, t.height)/t.tilesize;\n\t\t\tthis.nlevels = Math.ceil(Math.log(max) / Math.LN2) + 1;\n\n\t\t\tthis.url = this.url.substr(0, this.url.lastIndexOf(\"/\"));\n\n\t\t\tt.getTileURL = (x, y, level) => {\n\t\t\t\tlet ilevel = parseInt(this.nlevels - 1 - level);\n\t\t\t\tlet index = this.index(level, x, y)>>>0;\n\t\t\t\tlet group = index >> 8;\n\t\t\t\treturn this.url + \"/TileGroup\" + group + \"/\" + ilevel + \"-\" + x + \"-\" + y + \".\" + this.suffix;\n\t\t\t};\n\n\t\t\tthis.status = 'ready';\n\t\t\tthis.emit('ready');\n\n\t\t})().catch(e => { console.log(e); this.status = e; });\n\t}\n}\n\n\n\n\n//# sourceURL=webpack:///./src/Raster.js?");

/***/ }),

/***/ "./src/Transform.js":
/*!**************************!*\
  !*** ./src/Transform.js ***!
  \**************************/
/*! exports provided: Transform */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"Transform\", function() { return Transform; });\n\n/**\n * \n * @param {number} x position\n * @param {number} y position\n * @param {number} z scale\n * @param {number} a rotation\n * @param {number} t time\n *\n */\n\nclass Transform {\n\tconstructor(x, y, z, a, t) {\n\t\tif(x === null) {\n\t\t\tlet initial = { x: 0.0, y: 0.0, z: 1.0, a: 0.0, t: 0.0 };\n\t\t\tObject.assing(this, initial());\n\t\t\treturn;\n\t\t}\n\t\tthis.x = x ? x : 0.0;\n\t\tthis.y = y ? y : 0.0;\n\t\tthis.z = z ? z : 1.0;\n\t\tthis.a = a ? a : 0.0;\n\t\tthis.t = t ? t : 0.0;\n\t}\n\n\tcopy() {\n\t\treturn Object.assign({}, this);\n\t}\n\n\tinterpolate(source, target, time) {\n\t\tif(time < source.t) return source;\n\t\tif(time > target.t) return target;\n\n\t\tlet t = (target.t - source.t);\n\t\tif(t < 0.0001)\n\t\t\treturn target;\n\n\t\tlet tt = (time - source.t)/t;\n\t\tlet st = (target.t - t)/t;\n\n\t\tfor(let i of ['x', 'y', 'z', 'a'])\n\t\t\tthis[i] = (st*source[i] + tt*target[i]);\n\t\tthis.t = time;\n\t}\n}\n\n\n\n\n//# sourceURL=webpack:///./src/Transform.js?");

/***/ }),

/***/ "./src/index.js":
/*!**********************!*\
  !*** ./src/index.js ***!
  \**********************/
/*! no exports provided */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _OpenLIME_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./OpenLIME.js */ \"./src/OpenLIME.js\");\n/* harmony import */ var _Raster_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./Raster.js */ \"./src/Raster.js\");\n\n\n\nlet lime = new _OpenLIME_js__WEBPACK_IMPORTED_MODULE_0__[\"OpenLIME\"]('#openlime');\n\nlet raster = new _Raster_js__WEBPACK_IMPORTED_MODULE_1__[\"Raster\"]('normal', 'assets/svbrdf/normalMap.dzi', { layout: 'deepzoom', 'ready': runDeepzoomTest } );\n\n\nfunction runDeepzoomTest(event) {\n\tlet url = raster.getTileURL(2, 0, 0);\n\tconsole.log(url);\n}\n\nlime.draw();\n\n\n\n//# sourceURL=webpack:///./src/index.js?");

/***/ })

/******/ });