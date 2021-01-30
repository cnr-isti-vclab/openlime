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
/******/ 	var hotCurrentHash = "bac060086df1d900731f";
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
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"Camera\", function() { return Camera; });\n/* harmony import */ var _Transform_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Transform.js */ \"./src/Transform.js\");\n\n\n/**\n *  NOTICE TODO: the camera has the transform relative to the whole canvas NOT the viewport.\n * @param {object} options\n * * *bounded*: limit translation of the camera to the boundary of the scene.\n * * *maxZoom*: maximum zoom, 1:maxZoom is screen pixel to image pixel ratio.\n */\n\nclass Camera {\n\n\tconstructor(options) {\n\t\tObject.assign(this, {\n\t\t\tviewport: null,\n\t\t\tbounded: true,\n\t\t\tmaxZoom: 4,\n\t\t\tminZoom: 'full',\n\n\t\t\tsignals: {'update':[]}\n\t\t});\n\t\tObject.assign(this, options);\n\t\tthis.target = new _Transform_js__WEBPACK_IMPORTED_MODULE_0__[\"Transform\"](this.target);\n\t\tthis.source = this.target.copy();\n\t}\n\n\tcopy() {\n\t\tlet camera = new Camera();\n\t\tObject.assign(camera, this);\n\t\treturn camera;\n\t}\n\n\taddEvent(event, callback) {\n\t\tthis.signals[event].push(callback);\n\t}\n\n\temit(event) {\n\t\tfor(let r of this.signals[event])\n\t\t\tr(this);\n\t}\n\n/**\n *  Set the viewport and updates the camera for an as close as possible.\n */\n\tsetViewport(view) {\n\t\tthis.viewport = view;\n\t\t//TODO! update camera to keep the center in place and zoomm to approximate the content before.\n\t}\n\n/**\n *  Map coordinate relative to the canvas into scene coords. using the specified transform.\n * @returns [X, Y] in scene coordinates.\n */\n\tmapToScene(x, y, transform) {\n\t\t//compute coords relative to the center of the viewport.\n\t\tx -= this.viewport.w/2;\n\t\ty -= this.viewport.h/2;\n\t\tx /= transform.z;\n\t\ty /= transform.z;\n\t\tx -= transform.x;\n\t\ty -= transform.y;\n\t\t//TODO add rotation!\n\t\treturn {x:x, y:y};\n\t}\n\n\n\tsetPosition(dt, x, y, z, a) {\n\t\tlet now = performance.now();\n\t\tthis.source = this.getCurrentTransform(now);\n\t\tObject.assign(this.target, { x: x, y:y, z:z, a:a, t:now + dt });\n\t\tthis.emit('update');\n\t}\n\n/*\n * Pan the camera \n * @param {number} dx move the camera by dx pixels (positive means the image moves right).\n */\n\tpan(dt, dx, dy) {\n\t\tlet now = performance.now();\n\t\tlet m = this.getCurrentTransform(now);\n\t\tm.dx += dx;\n\t\tm.dy += dy;\n\t}\n\n/* zoom in or out at a specific point in canvas coords!\n * TODO: this is not quite right!\n */\n\tzoom(dt, dz, x, y) {\n\t\tif(!x) x = 0;\n\t\tif(!y) y = 0;\n\n\t\tlet now = performance.now();\n\t\tlet m = this.getCurrentTransform(now);\n\n\n\t\t//x, an y should be the center of the zoom.\n\n\n\t\tm.x += (m.x+x)*(1 - dz);\n\t\tm.y += (m.y+y)*(1 - dz);\n\n\t\tthis.setPosition(dt, m.x, m.y, m.z*dz, m.a);\n\t}\n\n\tgetCurrentTransform(time) {\n\t\tif(time < this.source.t)\n\t\t\treturn this.source.copy();\n\t\tif(time >= this.target.t)\n\t\t\treturn this.target.copy();\n\n\t\tlet pos = new _Transform_js__WEBPACK_IMPORTED_MODULE_0__[\"Transform\"]();\n\t\tpos.interpolate(this.source, this.target, time);\n\t\treturn pos;\n\t}\n\n/**\n * @param {Array} box fit the specified rectangle [minx, miny, maxx, maxy] in the canvas.\n * @param {number} dt animation duration in millisecond \n * @param {string} size how to fit the image: <contain | cover> default is contain (and cover is not implemented\n */\n\tfit(box, dt, size) {\n\t\tif(!dt) dt = 0;\n\n\t\t//find if we align the topbottom borders or the leftright border.\n\t\tlet w = this.viewport.dx;\n\t\tlet h = this.viewport.dy;\n\n\t\t//center of the viewport.\n\n\t\tlet bw = box[2] - box[0];\n\t\tlet bh = box[3] - box[1];\n\t\tlet z = Math.min(w/bw, h/bh);\n\n\t\tthis.setPosition(dt, (box[0] + box[2])/2, (box[1] + box[3])/2, z, 0);\n\t}\n\n}\n\n\n\n\n//# sourceURL=webpack:///./src/Camera.js?");

/***/ }),

/***/ "./src/Canvas.js":
/*!***********************!*\
  !*** ./src/Canvas.js ***!
  \***********************/
/*! exports provided: Canvas */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"Canvas\", function() { return Canvas; });\n/* harmony import */ var _Camera_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Camera.js */ \"./src/Camera.js\");\n\n\n/**\n * @param {WebGL} gl is the WebGL context\n * @param {Object} options\n * * *layers*: Object specifies layers (see. {@link Layer})\n */\n\nclass Canvas {\n\tconstructor(gl, camera, options) {\n\t\tObject.assign(this, { \n\t\t\tpreserveDrawingBuffer: false, \n\t\t\tgl: gl,\n\t\t\tcamera: camera,\n\t\t\tlayers: {},\n\n\t\t\tsignals: {'update':[]}\n\t\t});\n\n\t\tif(options) {\n\t\t\tObject.assign(this, options);\n\t\t\tfor(let id in this.layers)\n\t\t\t\tthis.addLayer(id, new Layer(id, this.layers[id]));\n\t\t}\n\t}\n\n\taddEvent(event, callback) {\n\t\tthis.signals[event].push(callback);\n\t}\n\n\temit(event) {\n\t\tfor(let r of this.signals[event])\n\t\t\tr(this);\n\t}\n\n\taddLayer(id, layer) {\n\t\tlayer.addEvent('update', () => { console.log('update!'); this.emit('update'); });\n\t\tlayer.gl = this.gl;\n\t\tthis.layers[id] = layer;\n\t}\n\n\n\tdraw(time) {\n\t\tlet gl = this.gl;\n\t\tlet view = this.camera.viewport;\n\t\tgl.viewport(view.x, view.y, view.dx, view.dy);\n\n\t\tvar b = [0, 1, 0, 1];\n\t\tgl.clearColor(b[0], b[1], b[2], b[3], b[4]);\n\t\tgl.clear(gl.COLOR_BUFFER_BIT);\n\n\t\tgl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);\n\t\tgl.enable(gl.BLEND);\n\n\t\tlet pos = this.camera.getCurrentTransform(time);\n\t\t//todo we could actually prefetch toward the future a little bit\n\t\tthis.prefetch(pos);\n\n\t\t//draw layers using zindex.\n\t\tlet ordered = Object.values(this.layers).sort( (a, b) => a.zindex - b.zindex);\n\n\t\t//NOTICE: camera(pos) must be relative to the WHOLE canvas\n\t\tfor(let layer of ordered)\n\t\t\tif(layer.visible)\n\t\t\t\tlayer.draw(pos, view)\n\n//TODO not really an elegant solution to tell if we have reached the target, the check should be in getCurrentTransform.\n\t\treturn pos.t == this.camera.target.t;\n\t}\n\n/**\n * This function have each layer to check which tiles are needed and schedule them for download.\n * @param {object} transform is the camera position (layer will combine with local transform).\n */\n\tprefetch(transform) {\n\t\tif(!transform)\n\t\t\ttransform = this.camera.getCurrentTransform(performance.now());\n\t\tfor(let id in this.layers)\n\t\t\tthis.layers[id].prefetch(transform, this.camera.viewport);\n\t}\n}\n\n\n\n\n//# sourceURL=webpack:///./src/Canvas.js?");

/***/ }),

/***/ "./src/Controller.js":
/*!***************************!*\
  !*** ./src/Controller.js ***!
  \***************************/
/*! exports provided: Controller */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"Controller\", function() { return Controller; });\n/**\n * @param {dom} element DOM element where mouse events will be listening.\n * @param {options} options \n * * *delay* inertia of the movement in ms.\n */\n\nclass Controller {\n\tconstructor(element, options) {\n\t\tObject.assign(this, {\n\t\t\telement:element,\n\t\t\tdebug: true,\n\t\t\tdelay: 0\n\t\t});\n\n\t\tObject.assign(this, options);\n\n\t\tthis.initEvents();\n\t}\n\n\tmouseDown(x, y, e) {  if(this.debug) console.log('Down ', x, y);}\n\n\tmouseUp(x, y, e) {  if(this.debug) console.log('Up ', x, y); }\n\t\n\tmouseMove(x, y, e) { if(this.debug) console.log('Move ', x, y); }\n\n\twheelDelta(x, y, d, e) {  if(this.debug) console.log('Delta ', x, y, d); }\n\n\tpinchStart(pos1, pos2, e) {if(this.debug) console.log('ZStart ', pos1, pos2); }\n\n\tpinchMove(pos1, pos2, e) {if(this.debug) console.log('ZMove ', pos1, pos2); }\n\n\n\teventToPosition(e, touch) {\n\t\tlet rect = e.currentTarget.getBoundingClientRect();\n\t\tlet cx = e.clientX;\n\t\tlet cy = e.clientY;\n\t\tif(typeof(touch) != 'undefined') {\n\t\t\tcx = e.targetTouches[touch].clientX;\n\t\t\tcy = e.targetTouches[touch].clientY;\n\t\t}\n\t\tlet x = cx - rect.left;\n\t\tlet y = cy - rect.top;\n\t\treturn { x:x, y:y }\n\t}\n\n\tinitEvents() {\n\n/* //TODO when the canvas occupy only part of the document we would like to prevent any mouseover/etc \n  when the user is panning !! Example demo code here, to be testes.\n\nfunction preventGlobalMouseEvents () {\n  document.body.style['pointer-events'] = 'none';\n}\n\nfunction restoreGlobalMouseEvents () {\n  document.body.style['pointer-events'] = 'auto';\n}\n\nfunction mousemoveListener (e) {\n  e.stopPropagation ();\n  // do whatever is needed while the user is moving the cursor around\n}\n\nfunction mouseupListener (e) {\n  restoreGlobalMouseEvents ();\n  document.removeEventListener ('mouseup',   mouseupListener,   {capture: true});\n  document.removeEventListener ('mousemove', mousemoveListener, {capture: true});\n  e.stopPropagation ();\n}\n\nfunction captureMouseEvents (e) {\n  preventGlobalMouseEvents ();\n  document.addEventListener ('mouseup',   mouseupListener,   {capture: true});\n  document.addEventListener ('mousemove', mousemoveListener, {capture: true});\n  e.preventDefault ();\n  e.stopPropagation ();\n}\n*/\n\t\tlet element = this.element;\n\t\telement.addEventListener('contextmenu', (e) => { \n\t\t\te.preventDefault(); \n\t\t\treturn false; \n\t\t});\n\n\t\telement.addEventListener('mouseup', (e) => {\n\t\t\tlet pos = this.eventToPosition(e);\n\t\t\tthis.mouseUp(pos.x, pos.y, e);\n\t\t\te.preventDefault(); \n\t\t\treturn false;\n\t\t});\n\n\t\telement.addEventListener('mousedown', (e) => {\n\t\t\tlet pos = this.eventToPosition(e);\n\t\t\tthis.mouseDown(pos.x, pos.y, e);\n\t\t\te.preventDefault(); \n\t\t\treturn false;\n\t\t}, { capture: true });\n\n\t\telement.addEventListener('mousemove', (e) => {\n\t\t\tlet pos = this.eventToPosition(e);\n\t\t\tthis.mouseMove(pos.x, pos.y, e);\n\t\t\te.preventDefault(); \n\t\t\treturn false;\n\t\t});\n\n\t\telement.addEventListener('touchstart', (e) => {\n\t\t\te.preventDefault();\n\t\n\t\t\tlet pos0 = this.eventToPosition(e, 0);\n\t\t\tif (e.targetTouches.length == 1) {\n\t\t\t\tthis.mouseDown(pos0.x, pos0.y, e);\n\n\t\t\t} else if (e.targetTouches.length == 2) {\n\t\t\t\tlet pos1 = this.eventToPosition(e, 1);\n\t\t\t\tthis.pinchStart(pos0, pos1, e);\n\t\t\t}\n\t\t}, false);\n\n\t\telement.addEventListener('touchend', (e) => {\n\t\t\tlet pos = this.eventToPosition(e);\n\t\t\tthis.mouseUp(pos.x, pos.y, e);\n\t\t\te.preventDefault();\n\t\t}, false);\n\n\t\telement.addEventListener('touchmove', (e) => {\n\t\t\tlet pos0 = this.eventToPosition(e, 0);\n\t\t\tif (e.targetTouches.length == 1) {\n\t\t\t\tthis.mouseMove(pos0.x, pos0.y, e);\n\t\t\t} else if (e.targetTouches.length == 2) {\n\t\t\t\tlet pos1 = this.eventToPosition(e, 1);\n\t\t\t\tthis.pinchMove(pos0, pos1, e);\n\t\t\t}\n\t\t\te.preventDefault();\n\t\t}, false);\n\n\t\telement.addEventListener('wheel', (e) => {\n\t\t\t//TODO support for delta X?\n\t\t\tlet pos = this.eventToPosition(e);\n\n\t\t\tlet delta = e.deltaY > 0? 1 : -1;\n\t\t\tthis.wheelDelta(pos.x, pos.y, delta, e);\n\t\t\te.preventDefault();\n\t\t});\n\n\t}\n}\n\n\n\n\n//# sourceURL=webpack:///./src/Controller.js?");

/***/ }),

/***/ "./src/Layer.js":
/*!**********************!*\
  !*** ./src/Layer.js ***!
  \**********************/
/*! exports provided: Layer */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"Layer\", function() { return Layer; });\n/* harmony import */ var _Transform_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Transform.js */ \"./src/Transform.js\");\n/* harmony import */ var _Raster_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./Raster.js */ \"./src/Raster.js\");\n/* harmony import */ var _Shader_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./Shader.js */ \"./src/Shader.js\");\n/* harmony import */ var _Layout_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./Layout.js */ \"./src/Layout.js\");\n\n\n\n\n\n\n/**\n * @param {string} id unique id for layer.\n * @param {object} options\n *  * *label*:\n *  * *transform*: relative coordinate [transformation](#transform) from layer to canvas\n *  * *visible*: where to render or not\n *  * *zindex*: stack ordering of the layer higher on top\n *  * *opacity*: from 0.0 to 1.0 (0.0 is fully transparent)\n *  * *rasters*: [rasters](#raster) used for rendering.\n *  * *controls*: shader parameters that can be modified (eg. light direction)\n *  * *shader*: [shader](#shader) used for rendering\n *  * *layout*: all the rasters in the layer MUST have the same layout.\n *  * *mipmapBias*: default 0.5, when to switch between different levels of the mipmap\n *  * *prefetchBorder*: border tiles prefetch (default 1)\n *  * *maxRequest*: max number of simultaneous requests (should be GLOBAL not per layer!) default 4\n */\n\nclass Layer {\n\tconstructor(options) {\n\n\t\tObject.assign(this, {\n\t\t\ttransform: new _Transform_js__WEBPACK_IMPORTED_MODULE_0__[\"Transform\"](),\n\t\t\tvisible: true,\n\t\t\tzindex: 0,\n\t\t\topacity: 1.0,\n\n\t\t\trasters: [],\n\t\t\tcontrols: {},\n\t\t\tshaders: {},\n\t\t\tlayout: 'image',\n\t\t\tshader: null, //current shader.\n\t\t\tgl: null,\n\n\t\t\tprefetchBorder: 1,\n\t\t\tmipmapBias: 0.5,\n\t\t\tmaxRequest: 4,\n\n\t\t\tsignals: { update: [] },  //update callbacks for a redraw\n\n\t//internal stuff, should not be passed as options.\n\t\t\ttiles: [],      //keep references to each texture (and status) indexed by level, x and y.\n\t\t\t\t\t\t\t//each tile is tex: [.. one for raster ..], missing: 3 missing tex before tile is ready.\n\t\t\t\t\t\t\t//only raster used by the shader will be loade.\n\t\t\tqueued: [],     //queue of tiles to be loaded.\n\t\t\trequested: {},  //tiles requested.\n\t\t});\n\n\t\tObject.assign(this, options);\n\n\t\t//create from derived class if type specified\n\t\tif(this.type) {\n\t\t\tif(this.type in this.types) {\n\t\t\t\toptions.type = null; //avoid infinite recursion!\n\t\t\t\treturn this.types[this.type](options);\n\t\t\t}\n\t\t\tthrow \"Layer type: \" + this.type + \" has not been loaded\";\n\t\t}\n\n\t\t//create members from options.\n\t\tthis.rasters = this.rasters.map((raster) => new _Raster_js__WEBPACK_IMPORTED_MODULE_1__[\"Raster\"](raster));\n\t\tthis.transform = new _Transform_js__WEBPACK_IMPORTED_MODULE_0__[\"Transform\"](this.transform);\n\n\t\t//layout needs to becommon among all rasters.\n\t\tif(typeof(this.layout) != 'object' && this.rasters.length) \n\t\t\tthis.setLayout(new _Layout_js__WEBPACK_IMPORTED_MODULE_3__[\"Layout\"](this.rasters[0], this.layout));\n\n\t\tif(this.shader)\n\t\t\tthis.shader = new _Shader_js__WEBPACK_IMPORTED_MODULE_2__[\"Shader\"](this.shader);\n\t}\n\n\taddEvent(event, callback) {\n\t\tthis.signals[event].push(callback);\n\t}\n\n\temit(event) {\n\t\tfor(let r of this.signals[event])\n\t\t\tr(this);\n\t}\n\n\tsetLayout(layout) {\n\t\tlet callback = () => { \n\t\t\tthis.status = 'ready';\n\t\t\tthis.setupTiles(); //setup expect status to be ready!\n\t\t\tthis.emit('update');\n\t\t};\n\t\tif(layout.status == 'ready') //layout already initialized.\n\t\t\tcallback();\n\t\telse\n\t\t\tlayout.addEvent('ready', callback);\n\t\tthis.layout = layout;\n\t}\n\n\n/**\n * @param {bool} visible\n */\n\tsetVisible(visible) {\n\t\tthis.visible = visible;\n\t\tthis.emit('update');\n\t}\n\n/**\n * @param {int} zindex\n */\n\tsetZindex(zindex) {\n\t\tthis.zindex = zindex;\n\t\tthis.emit('update');\n\t}\n\n\tboundingBox() {\n\t\treturn layuout.boundingBox();\n\n\t}\n\n/**\n *  render the \n */\n\tdraw(transform, viewport) {\n\n\t\t//exception for layout image where we still do not know the image size\\\n\t\t//how linear or srgb should be specified here.\n//\t\tgl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);\n\t\tif(this.status != 'ready') {\n\t\t\tif(this.layout.type == 'image' && !this.requested[0])\n\t\t\t\tthis.loadTile({index:0, level:0, x:0, y:0});\n\t\t\treturn;\n\t\t}\n\n\t\tif(!this.shader)\n\t\t\tthrow \"Shader not specified!\";\n\n\t\tif(!this.tiles)\n\t\t\treturn;\n\n\t\tthis.prepareWebGL();\n\n\n//\t\tfind which quads to draw and in case request for them\n\t\ttransform = transform.compose(this.transform);\n\t\tlet needed = this.layout.neededBox(viewport, transform, this.prefetchBorder, this.mipmapBias);\n\n\n\t\tlet torender = this.toRender(needed);\n\n\t\tlet matrix = transform.projectionMatrix(viewport);\n\t\tthis.gl.uniformMatrix4fv(this.shader.matrixlocation, this.gl.FALSE, matrix);\n\n\t\tfor(let index in torender) {\n\t\t\tlet tile = torender[index];\n\t\t\tif(tile.complete)\n\t\t\t\tthis.drawTile(torender[index]);\n\t\t}\n\n//\t\tgl.uniform1f(t.opacitylocation, t.opacity);\n\t}\n\n\tdrawTile(tile) {\n\n\t\tlet tiledata = this.tiles[tile.index];\n\t\tif(tiledata.missing != 0) \n\t\t\tthrow \"Attempt to draw tile still missing textures\"\n\n\t\t//TODO might want to change the function to oaccept tile as argument\n\t\tlet c = this.layout.tileCoords(tile.level, tile.x, tile.y);\n\n\t\t//update coords and texture buffers\n\t\tthis.updateTileBuffers(c.coords, c.tcoords);\n\n\t\t//bind textures\n\t\tlet gl = this.gl;\n\t\tfor(var i = 0; i < this.shader.samplers.length; i++) {\n\t\t\tlet id = this.shader.samplers[i].id;\n\t\t\tgl.uniform1i(this.shader.samplers[i].location, i);\n\t\t\tgl.activeTexture(gl.TEXTURE0 + i);\n\t\t\tgl.bindTexture(gl.TEXTURE_2D, tiledata.tex[id]);\n\t\t}\n\t\tgl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT,0);\n\t}\n\n/* given the full pyramid of needed tiles for a certain bounding box, \n *  starts from the preferred levels and goes up in the hierarchy if a tile is missing.\n *  complete is true if all of the 'brothers' in the hierarchy are loaded,\n *  drawing incomplete tiles enhance the resolution early at the cost of some overdrawing and problems with opacity.\n */\n\n\ttoRender(needed) {\n\n\t\tvar torender = {}; //array of minlevel, actual level, x, y (referred to minlevel)\n\t\tvar brothers = {};\n\n\t\tlet minlevel = needed.level;\n\t\tvar box = needed.pyramid[minlevel];\n\n\t\tfor(var y = box[1]; y < box[3]; y++) {\n\t\t\tfor(var x = box[0]; x < box[2]; x++) {\n\t\t\t\tvar level = minlevel;\n\t\t\t\twhile(level < this.layout.nlevels) {\n\t\t\t\t\tvar d = level -minlevel;\n\t\t\t\t\tvar index = this.layout.index(level, x>>d, y>>d);\n\t\t\t\t\tif(this.tiles[index].missing == 0) {\n\t\t\t\t\t\ttorender[index] = {index:index, level:level, x:x>>d, y:y>>d, complete:true};\n\t\t\t\t\t\tbreak;\n\t\t\t\t\t} else {\n\t\t\t\t\t\tvar sx = (x>>(d+1))<<1;\n\t\t\t\t\t\tvar sy = (y>>(d+1))<<1;\n\t\t\t\t\t\tbrothers[this.layout.index(level, sx, sy)] = 1;\n\t\t\t\t\t\tbrothers[this.layout.index(level, sx+1, sy)] = 1;\n\t\t\t\t\t\tbrothers[this.layout.index(level, sx+1, sy+1)] = 1;\n\t\t\t\t\t\tbrothers[this.layout.index(level, sx, sy+1)] = 1;\n\t\t\t\t\t}\n\t\t\t\t\tlevel++;\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t\tfor(let index in brothers) {\n\t\t\tif(index in torender)\n\t\t\t\ttorender[index].complete = false;\n\t\t}\n\t\treturn torender;\n\t}\n\n\n\tupdateTileBuffers(coords, tcoords) {\n\t\tlet gl = this.gl;\n\t\t//TODO to reduce the number of calls (probably not needed) we can join buffers, and just make one call per draw! (except the bufferData, which is per node)\n\t\tgl.bindBuffer(gl.ARRAY_BUFFER, this.vbuffer);\n\t\tgl.bufferData(gl.ARRAY_BUFFER, coords, gl.STATIC_DRAW);\n\n\t\tgl.vertexAttribPointer(this.shader.coordattrib, 3, gl.FLOAT, false, 0, 0);\n\t\tgl.enableVertexAttribArray(this.shader.coordattrib);\n\n\t\tgl.bindBuffer(gl.ARRAY_BUFFER, this.tbuffer);\n\t\tgl.bufferData(gl.ARRAY_BUFFER, tcoords, gl.STATIC_DRAW);\n\n\t\tgl.vertexAttribPointer(this.shader.texattrib, 2, gl.FLOAT, false, 0, 0);\n\t\tgl.enableVertexAttribArray(this.shader.texattrib);\n\t}\n\n\tsetShader(id) {\n\t\tif(!id in this.shaders)\n\t\t\tthrow \"Unknown shader: \" + id;\n\t\tthis.shader = this.shaders[id];\n\t\tthis.setupTiles();\n\t}\n\n/**\n *  If layout is ready and shader is assigned, creates or update tiles to keep track of what is missing.\n */\n\tsetupTiles() {\n\t\tif(!this.shader || !this.layout || this.layout.status != 'ready')\n\t\t\treturn;\n\n\t\tlet ntiles = this.layout.ntiles;\n\n\t\tif(typeof(this.tiles) != 'array' || this.tiles.length != ntiles) {\n\t\t\tthis.tiles = new Array(ntiles);\n\t\t\tfor(let i = 0; i < ntiles; i++)\n\t\t\t\tthis.tiles[i] = { tex:new Array(this.shader.samplers.length), missing:this.shader.samplers.length };\n\t\t\treturn;\n\t\t}\n\n\t\tfor(let tile of this.ntiles) {\n\t\t\ttile.missing = this.shader.samplers.length;;\n\t\t\tfor(let sampler of this.shader.samplers) {\n\t\t\t\tif(tile.tex[sampler.id])\n\t\t\t\t\ttile.missing--;\n\t\t\t}\n\t\t}\n\t}\n\n\tprepareWebGL() {\n\t\t//interpolate uniforms from controls!\n\t\t//update uniforms\n\n\t\tlet gl = this.gl;\n\n\t\tif(this.shader.needsUpdate) {\n\t\t\tthis.shader.createProgram(gl);\n\t\t\t//send uniforms here!\n\t\t}\n\n\t\tgl.useProgram(this.shader.program);\n\n\t\tif(this.ibuffer) //this part might go into another function.\n\t\t\treturn;\n\n\t\tthis.ibuffer = gl.createBuffer();\n\t\tgl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibuffer);\n\t\tgl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([3,2,1,3,1,0]), gl.STATIC_DRAW);\n\n\t\tthis.vbuffer = gl.createBuffer();\n\t\tgl.bindBuffer(gl.ARRAY_BUFFER, this.vbuffer);\n\t\tgl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 0,  0, 1, 0,  1, 1, 0,  1, 0, 0]), gl.STATIC_DRAW);\n\n\t\tthis.tbuffer = gl.createBuffer();\n\t\tgl.bindBuffer(gl.ARRAY_BUFFER, this.tbuffer);\n\t\tgl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0,  0, 1,  1, 1,  1, 0]), gl.STATIC_DRAW);\n\t}\n\n/**\n*  @param {object] transform is the canvas coordinate transformation\n*  @param {viewport} is the viewport for the rendering, note: for lens might be different! Where we change it? here layer should know!\n*/\n\tprefetch(transform, viewport) {\n\t\tif(this.status != 'ready' || !this.visible)\n\t\t\treturn;\n\n\t\tlet needed = this.layout.neededBox(viewport, transform, this.prefetchBorder, this.mipmapBias);\n\t\tlet minlevel = needed.level;\n\n\t\t\n\n//TODO is this optimization (no change => no prefetch?) really needed?\n/*\t\tlet box = needed.box[minlevel];\n\t\tif(this.previouslevel == minlevel && box[0] == t.previousbox[0] && box[1] == this.previousbox[1] &&\n\t\tbox[2] == this.previousbox[2] && box[3] == this.previousbox[3])\n\t\t\treturn;\n\n\t\tthis.previouslevel = minlevel;\n\t\tthis.previousbox = box; */\n\n\t\tthis.queued = [];\n\n\t\t//look for needed nodes and prefetched nodes (on the pos destination\n\t\tfor(let level = this.layout.nlevels-1; level >= minlevel; level--) {\n\t\t\tlet box = needed.pyramid[level];\n\t\t\tlet tmp = [];\n\t\t\tfor(let y = box[1]; y < box[3]; y++) {\n\t\t\t\tfor(let x = box[0]; x < box[2]; x++) {\n\t\t\t\t\tlet index = this.layout.index(level, x, y);\n\t\t\t\t\tif(this.tiles[index].missing != 0 && !this.requested[index])\n\t\t\t\t\t\ttmp.push({level:level, x:x, y:y, index:index});\n\t\t\t\t}\n\t\t\t}\n\t\t\tlet cx = (box[0] + box[2])/2;\n\t\t\tlet cy = (box[1] + box[3])/2;\n\t\t\t//sort tiles by distance to the center TODO: check it's correct!\n\t\t\ttmp.sort(function(a, b) { return Math.abs(a.x - cx) + Math.abs(a.y - cy) - Math.abs(b.x - cx) - Math.abs(b.y - cy); });\n\t\t\tthis.queued = this.queued.concat(tmp);\n\t\t}\n\t\tthis.preload();\n\t}\n\n/**\n * Checks load tiles from the queue. TODO this needs to be global! Not per layer.\n *\n */\n\tpreload() {\n\t\twhile(Object.keys(this.requested).length < this.maxRequest && this.queued.length > 0) {\n\t\t\tvar tile = this.queued.shift();\n\t\t\tthis.loadTile(tile);\n\t\t}\n\t}\n\n\tloadTile(tile) {\n\t\tif(this.requested[tile.index])\n\t\t\tthrow\"AAARRGGHHH double request!\";\n\n\t\tthis.requested[tile.index] = true;\n\n\t\tfor(let sampler of this.shader.samplers) {\n\t\t\tlet path = this.layout.getTileURL(this.rasters[sampler.id].url, tile.x, tile.y, tile.level );\n\t\t\tlet raster = this.rasters[sampler.id];\n\t\t\traster.loadImage(path, this.gl, (tex) => {\n\n\t\t\t\tif(this.layout.type == \"image\") { //TODO create an ad hoc function for layout image.\n\t\t\t\t\tthis.layout.initImage(raster.width, raster.height);\n\t\t\t\t}\n\t\t\t\tlet indextile = this.tiles[tile.index];\n\t\t\t\tindextile.tex[sampler.id] = tex;\n\t\t\t\tindextile.missing--;\n\t\t\t\tif(indextile.missing <= 0) {\n\t\t\t\t\tthis.emit('update');\n\t\t\t\t\tdelete this.requested[tile.index];\n\t\t\t\t}\n\t\t\t});\n\t\t}\n\t}\n\n}\n\n\nLayer.prototype.types = {}\n\n\n\n\n//# sourceURL=webpack:///./src/Layer.js?");

/***/ }),

/***/ "./src/LayerCombiner.js":
/*!******************************!*\
  !*** ./src/LayerCombiner.js ***!
  \******************************/
/*! exports provided: LayerCombiner */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"LayerCombiner\", function() { return LayerCombiner; });\n/* harmony import */ var _Layer_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Layer.js */ \"./src/Layer.js\");\n/* harmony import */ var _Raster_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./Raster.js */ \"./src/Raster.js\");\n/* harmony import */ var _Shader_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./Shader.js */ \"./src/Shader.js\");\n/* harmony import */ var _Layout_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./Layout.js */ \"./src/Layout.js\");\n/* harmony import */ var _ShaderCombiner_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./ShaderCombiner.js */ \"./src/ShaderCombiner.js\");\n\n\n\n\n\n\n\n/**\n * Extends {@link Layer}.\n * @param {options} options Same as {@link Layer}, but url and layout are required.\n */\nclass LayerCombiner extends _Layer_js__WEBPACK_IMPORTED_MODULE_0__[\"Layer\"] {\n\tconstructor(options) {\n\t\tsuper(options);\n\n\t\tif(Object.keys(this.rasters).length != 0)\n\t\t\tthrow \"Rasters options should be empty!\";\n\n\t\tthis.layout = 'image';\n\t\tthis.setLayout(new _Layout_js__WEBPACK_IMPORTED_MODULE_3__[\"Layout\"](this.url, this.layout));\n\n\n\t\tlet shader = new _ShaderCombiner_js__WEBPACK_IMPORTED_MODULE_4__[\"ShaderCombiner\"]({\n\t\t\t'label': 'Combiner',\n\t\t\t'samplers': [{ id:0, name:'source1', type:'vec3' }, { id:1, name:'source2', type:'vec3' }],\n\t\t});\n\n\t\tthis.shaders = {'standard': shader };\n\t\tthis.setShader('standard');\n\n//todo if layers check for importjson\n\n\t\tthis.textures = [];\n\t\tthis.framebuffers = [];\n\t}\n\n\n\tdraw(transform, viewport) {\n\t\tfor(let layer of this.layers)\n\t\t\tif(layer.status != 'ready')\n\t\t\t\treturn;\n\n\t\tif(!this.shader)\n\t\t\tthrow \"Shader not specified!\";\n\n\t\tlet w = viewport.dx;\n\t\tlet h = viewport.dy;\n\n\t\tif(!this.framebuffers.length || this.layout.width != w || this.layout.height != h) {\n\t\t\tthis.deleteFramebuffers();\n\t\t\tthis.layout.width = w;\n\t\t\tthis.layout.height = h;\n\t\t\tthis.createFramebuffers();\n\t\t}\n\n\t\tlet gl = this.gl;\n\t\tgl.viewport(viewport.x, viewport.y, viewport.dx, viewport.dy);\n\n\t\tvar b = [0, 0, 0, 0];\n\t\tgl.clearColor(b[0], b[1], b[2], b[3], b[4]);\n\n\n//TODO optimize: render to texture ONLY if some parameters change!\n//provider di textures... max memory and reference counting.\n\n\t\tfor(let i = 0; i < this.layers.length; i++) { \n\t\t\tgl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[i]);\n\t\t\tgl.clear(gl.COLOR_BUFFER_BIT);\n\t\t\tthis.layers[i].draw(transform, [0, 0, w, h]);\n\t\t\tgl.bindFramebuffer(gl.FRAMEBUFFER, null);\n\t\t}\n\n\n\t\tthis.prepareWebGL();\n\n\t\tfor(let i = 0; i < this.layers.length; i++) {\n\t\t\tgl.uniform1i(this.shader.samplers[i].location, i);\n\t\t\tgl.activeTexture(gl.TEXTURE0 + i);\n\t\t\tgl.bindTexture(gl.TEXTURE_2D, this.textures[i]);\n\t\t}\n\n\n\n\t\tthis.updateTileBuffers(\n\t\t\tnew Float32Array([-1, -1, 0,  -1, 1, 0,  1, 1, 0,  1, -1, 0]), \n\t\t\tnew Float32Array([ 0,  0,      0, 1,     1, 1,     1,  0]));\n\t\tgl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT,0);\n\t}\n\n\tcreateFramebuffers() {\n\t\tlet gl = this.gl;\n\t\tfor(let i = 0; i < this.layers.length; i++) {\n\t\t\t//TODO for thing like lens, we might want to create SMALLER textures for some layers.\n\t\t\tconst texture = gl.createTexture();\n\n\t\t\tgl.bindTexture(gl.TEXTURE_2D, texture);\n\n\t\t\tconst level = 0;\n\t\t\tconst internalFormat = gl.RGBA;\n\t\t\tconst border = 0;\n\t\t\tconst format = gl.RGBA;\n\t\t\tconst type = gl.UNSIGNED_BYTE;\n\t\t\tgl.texImage2D(gl.TEXTURE_2D, level, internalFormat,\n\t\t\t\tthis.layout.width, this.layout.height, border, format, type, null);\n\n\t\t\tgl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);\n\t\t\tgl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);\n\t\t\tgl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);\n\n\t\t\tconst framebuffer = gl.createFramebuffer();\n\t\t\tgl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);\n\t\t\tgl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);\n\t\t\tgl.bindFramebuffer(gl.FRAMEBUFFER, null);\n\n\t\t\tthis.textures[i] = texture;\n\t\t\tthis.framebuffers[i] = framebuffer;\n\t\t}\n\t}\n\t//TODO release textures and framebuffers\n\tdeleteFramebuffers() {\n\t}\n}\n\n_Layer_js__WEBPACK_IMPORTED_MODULE_0__[\"Layer\"].prototype.types['combiner'] = (options) => { return new ImageCombiner(options); }\n\n\n\n\n//# sourceURL=webpack:///./src/LayerCombiner.js?");

/***/ }),

/***/ "./src/LayerImage.js":
/*!***************************!*\
  !*** ./src/LayerImage.js ***!
  \***************************/
/*! exports provided: LayerImage */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"LayerImage\", function() { return LayerImage; });\n/* harmony import */ var _Layer_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Layer.js */ \"./src/Layer.js\");\n/* harmony import */ var _Raster_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./Raster.js */ \"./src/Raster.js\");\n/* harmony import */ var _Shader_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./Shader.js */ \"./src/Shader.js\");\n/* harmony import */ var _Layout_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./Layout.js */ \"./src/Layout.js\");\n\n\n\n\n\n/**\n * Extends {@link Layer}.\n * @param {options} options Same as {@link Layer}, but url and layout are required.\n */\n\nclass LayerImage extends _Layer_js__WEBPACK_IMPORTED_MODULE_0__[\"Layer\"] {\n\tconstructor(options) {\n\t\tsuper(options);\n\n\t\tif(Object.keys(this.rasters).length != 0)\n\t\t\tthrow \"Rasters options should be empty!\";\n\n\t\tif(!this.url)\n\t\t\tthrow \"Url option is required\";\n\n\t\tif(!this.layout)\n\t\t\tthis.layout = 'image';\n\n\t\tthis.rasters.push(new _Raster_js__WEBPACK_IMPORTED_MODULE_1__[\"Raster\"]({ url: this.url, type: 'vec3', attribute: 'kd', colorspace: 'sRGB' }));\n\n\t\tlet size = {width:this.width, height:this.height};\n\t\tthis.setLayout(new _Layout_js__WEBPACK_IMPORTED_MODULE_3__[\"Layout\"](this.url, this.layout, size));\n\n\n\t\tlet shader = new _Shader_js__WEBPACK_IMPORTED_MODULE_2__[\"Shader\"]({\n\t\t\t'label': 'Rgb',\n\t\t\t'samplers': [{ id:0, name:'kd', type:'vec3' }],\n\t\t\t'body': `#version 300 es\n\nprecision highp float; \nprecision highp int; \n\nuniform sampler2D kd;\n\nin vec2 v_texcoord;\nout vec4 color;\n\n\nvoid main() {\n\tcolor = texture(kd, v_texcoord);\n}\n`\n\t\t});\n\n\t\tthis.shaders = {'standard': shader };\n\t\tthis.setShader('standard');\n\t}\n}\n\n_Layer_js__WEBPACK_IMPORTED_MODULE_0__[\"Layer\"].prototype.types['image'] = (options) => { return new LayerImage(options); }\n\n\n\n\n//# sourceURL=webpack:///./src/LayerImage.js?");

/***/ }),

/***/ "./src/Layout.js":
/*!***********************!*\
  !*** ./src/Layout.js ***!
  \***********************/
/*! exports provided: Layout */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"Layout\", function() { return Layout; });\n\n/**\n * @param {string|Object} url URL of the image or the tiled config file, \n * @param {string} type select one among: <image, {@link https://www.microimages.com/documentation/TechGuides/78googleMapsStruc.pdf google}, {@link https://docs.microsoft.com/en-us/previous-versions/windows/silverlight/dotnet-windows-silverlight/cc645077(v=vs.95)?redirectedfrom=MSDN deepzoom}, {@link http://www.zoomify.com/ZIFFileFormatSpecification.htm zoomify}, {@link https://iipimage.sourceforge.io/ iip}, {@link https://iiif.io/api/image/3.0/ iiif}>\n */\nclass Layout {\n\tconstructor(url, type, options) {\n\t\tObject.assign(this, {\n\t\t\ttype: type,\n\t\t\twidth: null,\n\t\t\theight: null,\n\t\t\ttilesize: 256,\n\t\t\toverlap: 0, \n\t\t\tnlevels: 1,        //level 0 is the top, single tile level.\n\t\t\tntiles: 1,         //tot number of tiles\n\t\t\tsuffix: 'jpg',\n\t\t\tqbox: [],          //array of bounding box in tiles, one for mipmap \n\t\t\tbbox: [],          //array of bounding box in pixels (w, h)\n\n\t\t\tsignals: { ready: [] },          //callbacks when the layout is ready.\n\t\t\tstatus: null\n\t\t});\n\t\tif(options)\n\t\t\tObject.assign(this, options);\n\n\t\tif(typeof(url) == 'string') {\n\t\t\tthis.url = url;\n\t\t\tlet callback = () => {\n\t\t\t\tthis.ntiles = this.initBoxes();\n\t\t\t\tthis.status = 'ready';\n\t\t\t\tthis.emit('ready');\n\t\t\t}\n\n\t\t\tswitch(this.type) {\n\t\t\t\tcase 'image':    this.initImage(this.width, this.height); break;\n\t\t\t\tcase 'google':   this.initGoogle(callback); break;\n\t\t\t\tcase 'deepzoom': this.initDeepzoom(callback); break;\n\t\t\t\tcase 'zoomify': this.initZoomify(callback); break;\n\t\t\t}\n\t\t\treturn;\n\t\t}\n\n\t\tif(typeof(url) == 'object')\n\t\t\tObject.assign(this, url);\n\t}\n\n\taddEvent(event, callback) {\n\t\tthis.signals[event].push(callback);\n\t}\n\n\temit(event) {\n\t\tfor(let r of this.signals[event])\n\t\t\tr(this);\n\t}\n\n\tisReady() {\n\t\treturn this.status == 'ready' && this.width && this.height;\n\t}\n\n\tboundingBox() {\n\t\treturn [-width/2, -height/2, width/2, height/2];\n\t}\n\n/**\n *  Each tile is assigned an unique number.\n */\n\n\tindex(level, x, y) {\n\t\tvar startindex = 0;\n\t\tfor(var i = this.nlevels-1; i > level; i--) {\n\t\t\tstartindex += this.qbox[i][2]*this.qbox[i][3];\n\t\t}\n\t\treturn startindex + y*this.qbox[level][2] + x;\n\t}\n\n/*\n * Compute all the bounding boxes (this.bbox and this.qbox).\n * @return number of tiles in the dataset\n*/\n\n\tinitBoxes() {\n\t\tthis.qbox = []; //by level (0 is the bottom)\n\t\tthis.bbox = [];\n\t\tvar w = this.width;\n\t\tvar h = this.height;\n\n\t\tif(this.type == 'image') {\n\t\t\tthis.qbox[0] = [0, 0, 1, 1];\n\t\t\tthis.bbox[0] = [0, 0, w, h];\n\t\t\treturn 1;\n\t\t}\n\n\t\tvar count = 0;\n\t\tfor(var level = this.nlevels - 1; level >= 0; level--) {\n\t\t\tvar ilevel = this.nlevels -1 - level;\n\t\t\tthis.qbox[ilevel] = [0, 0, 0, 0];\n\t\t\tthis.bbox[ilevel] = [0, 0, w, h];\n\t\t\tfor(var y = 0; y*this.tilesize < h; y++) {\n\t\t\t\tthis.qbox[ilevel][3] = y+1;\n\t\t\t\tfor(var x = 0; x*this.tilesize < w; x ++) {\n\t\t\t\t\tcount++;\n\t\t\t\t\tthis.qbox[ilevel][2] = x+1;\n\t\t\t\t}\n\t\t\t}\n\t\t\tw >>>= 1;\n\t\t\th >>>= 1;\n\t\t}\n\t\treturn count;\n\t}\n\n\n/** Return the coordinates of the tile (in [0, 0, w h] image coordinate system) and the texture coords associated. \n *\n */\n\ttileCoords(level, x, y) {\n\t\tlet w = this.width;\n\t\tlet h = this.height;\n\t\t//careful: here y is inverted due to textures not being flipped on load (Firefox fault!).\n\t\tvar tcoords = new Float32Array([0, 1,     0, 0,     1, 0,     1, 1]);\n\n\t\tif(this.type == \"image\") {\n\t\t\treturn { \n\t\t\t\tcoords: new Float32Array([-w/2, -h/2, 0,  -w/2, h/2, 0,  w/2, h/2, 0,  w/2, -h/2, 0]),\n\t\t\t\ttcoords: tcoords \n\t\t\t};\n\t\t}\n\n\t\tlet coords = new Float32Array([0, 0, 0,  0, 1, 0,  1, 1, 0,  1, 0, 0]);\n\n\n\t\tlet side =  this.tilesize*(1<<(level)); //tile size in imagespace\n\t\tlet tx = side;\n\t\tlet ty = side;\n\n\t\tif(side*(x+1) > this.width) {\n\t\t\ttx = (this.width  - side*x);\n\t\t\tif(this.type == 'google')\n\t\t\t\ttcoords[4] = tcoords[6] = tx/side;\n\t\t}\n\t\tif(side*(y+1) > this.height) {\n\t\t\tty = (this.height - side*y);\n\t\t\tif(this.type == 'google')\n\t\t\t\ttcoords[1] = tcoords[7] = ty/side;\n\t\t}\n\n\t\tvar lx  = this.qbox[level][2]-1; //last tile x pos, if so no overlap.\n\t\tvar ly  = this.qbox[level][3]-1;\n\n\t\tvar over = this.overlap;\n\t\tif(over) {\n\t\t\tlet dtx = over / (tx/(1<<level) + (x==0?0:over) + (x==lx?0:over));\n\t\t\tlet dty = over / (ty/(1<<level) + (y==0?0:over) + (y==ly?0:over));\n\n\t\t\ttcoords[0] = tcoords[2] = (x==0? 0: dtx);\n\t\t\ttcoords[1] = tcoords[7] = (y==0? 0: dty);\n\t\t\ttcoords[4] = tcoords[6] = (x==lx? 1: 1 - dtx);\n\t\t\ttcoords[3] = tcoords[5] = (y==ly? 1: 1 - dty);\n\t\t}\n\t\tif(this.type == 'google') {\n\t\t\t//flip Y in coords\n\t\t\tlet tmp = tcoords[1];\n\t\t\ttcoords[1] = tcoords[7] = tcoords[3];\n\t\t\ttcoords[3] = tcoords[5] = tmp;\n\t\t}\n\t\tfor(let i = 0; i < coords.length; i+= 3) {\n\t\t\tcoords[i]   =  coords[i]  *tx + side*x - this.width/2;\n\t\t\tcoords[i+1] = -coords[i+1]*ty - side*y + this.height/2;\n\t\t}\n\n\t\treturn { coords: coords, tcoords: tcoords }\n\t}\n\n\n/**\n * Given a viewport and a transform computes the tiles needed for each level.\n * @param {array} viewport array with left, bottom, width, height\n * @param {border} border is radius (in tiles units) of prefetch\n * @returns {object} with level: the optimal level in the pyramid, pyramid: array of bounding boxes in tile units.\n */\n\tneededBox(viewport, transform, border, bias) {\n\t\tif(this.type == \"image\")\n\t\t\treturn { level:0, pyramid: [[0, 0, 1, 1]] };\n\n\t\t//here we are computing with inverse levels; level 0 is the bottom!\n\t\tlet minlevel = Math.max(0, Math.min(Math.floor(-Math.log2(transform.z) + bias), this.nlevels-1));\n\n\t\tlet bbox = transform.getInverseBox(viewport);\n\n\t\tlet pyramid = [];\n\t\tfor(let level = this.nlevels-1; level >= minlevel; level--) {\n\t\t\tlet side = this.tilesize*Math.pow(2, level);\n\n\t\t\t//quantized bbox\n\t\t\tlet qbox = [\n\t\t\t\tMath.floor((bbox[0])/side),\n\t\t\t\tMath.floor((bbox[1])/side),\n\t\t\t\tMath.floor((bbox[2]-1)/side) + 1,\n\t\t\t\tMath.floor((bbox[3]-1)/side) + 1];\n\n\t\t\t//clamp!\n\t\t\tqbox[0] = Math.max(qbox[0]-border, this.qbox[level][0]);\n\t\t\tqbox[1] = Math.max(qbox[1]-border, this.qbox[level][1]);\n\t\t\tqbox[2] = Math.min(qbox[2]+border, this.qbox[level][2]);\n\t\t\tqbox[3] = Math.min(qbox[3]+border, this.qbox[level][3]);\n\t\t\tpyramid[level] = qbox;\n\t\t}\n\t\treturn { level:minlevel, pyramid: pyramid };\n\t}\n\n\tgetTileURL(url, level, x, y) {\n\t\tthrow Error(\"Layout not defined or ready.\");\n\t}\n\n\n\n/*\n * Witdh and height can be recovered once the image is downloaded.\n*/\n\tinitImage(width, height) {\n\t\tthis.getTileURL = (url, x, y, level) => { return url; }\n\t\tthis.nlevels = 1;\n\t\tthis.tilesize = 0;\n\n\t\tif(width && height) {\n\t\t\tthis.width = width;\n\t\t\tthis.height = height;\n\t\t\tthis.ntiles = this.initBoxes();\n\n\t\t\tthis.status = 'ready';\n\t\t\tthis.emit('ready');\n\t\t}\n\t}\n\n/**\n *  url points to the folder (without /)\n *  width and height must be defined\n */\n\tinitGoogle(callback) {\n\t\tif(!this.width || !this.height)\n\t\t\tthrow \"Google rasters require to specify width and height\";\n\n\t\tthis.tilesize = 256;\n\t\tthis.overlap = 0;\n\n\t\tlet max = Math.max(this.width, this.height)/this.tilesize;\n\t\tthis.nlevels = Math.ceil(Math.log(max) / Math.LN2) + 1;\n\n\t\tthis.getTileURL = (url, x, y, level) => {\n\t\t\tvar ilevel = parseInt(this.nlevels - 1 - level);\n\t\t\treturn url + \"/\" + ilevel + \"/\" + y + \"/\" + x + '.' + this.suffix;\n\t\t};\n\t\tcallback();\n\t}\n\n\n/**\n * Expects the url to point to .dzi config file\n */\n\tinitDeepzoom(callback) {\n\t\t(async () => {\n\t\t\tvar response = await fetch(this.url);\n\t\t\tif(!response.ok) {\n\t\t\t\tthis.status = \"Failed loading \" + this.url + \": \" + response.statusText;\n\t\t\t\treturn;\n\t\t\t}\n\t\t\tlet text = await response.text();\n\t\t\tlet xml = (new window.DOMParser()).parseFromString(text, \"text/xml\");\n\n\t\t\tlet doc = xml.documentElement;\n\t\t\tthis.suffix = doc.getAttribute('Format');\n\t\t\tthis.tilesize = doc.getAttribute('TileSize');\n\t\t\tthis.overlap = doc.getAttribute('Overlap');\n\n\t\t\tlet size = doc.querySelector('Size');\n\t\t\tthis.width = size.getAttribute('Width');\n\t\t\tthis.height = size.getAttribute('Height');\n\n\t\t\tlet max = Math.max(this.width, this.height)/this.tilesize;\n\t\t\tthis.nlevels = Math.ceil(Math.log(max) / Math.LN2) + 1;\n\n\t\t\tthis.url = this.url.substr(0, this.url.lastIndexOf(\".\")) + '_files/';\n\n\t\t\tthis.getTileURL = (url, x, y, level) => {\n\t\t\t\turl = url.substr(0, url.lastIndexOf(\".\")) + '_files/';\n\t\t\t\tlet ilevel = parseInt(this.nlevels - 1 - level);\n\t\t\t\treturn url + ilevel + '/' + x + '_' + y + '.' + this.suffix;\n\t\t\t}; \n\n\t\t\tcallback();\n\n\t\t})().catch(e => { console.log(e); this.status = e; });\n\t}\n\n\n/**\n * Expects the url to point to ImageProperties.xml file.\n */\n\tinitZoomify(callback) {\n\t\tthis.overlap = 0;\n\t\t(async () => {\n\t\t\tvar response = await fetch(this.url);\n\t\t\tif(!response.ok) {\n\t\t\t\tthis.status = \"Failed loading \" + this.url + \": \" + response.statusText;\n\t\t\t\treturn;\n\t\t\t}\n\t\t\tlet text = await response.text();\n\t\t\tlet xml = (new window.DOMParser()).parseFromString(text, \"text/xml\");\n\t\t\tlet doc = xml.documentElement;\n\t\t\tthis.tilesize = parseInt(doc.getAttribute('TILESIZE'));\n\t\t\tthis.width = parseInt(doc.getAttribute('WIDTH'));\n\t\t\tthis.height = parseInt(doc.getAttribute('HEIGHT'));\n\t\t\tif(!this.tilesize || !this.height || !this.width)\n\t\t\t\tthrow \"Missing parameter files for zoomify!\";\n\n\t\t\tlet max = Math.max(this.width, this.height)/this.tilesize;\n\t\t\tthis.nlevels = Math.ceil(Math.log(max) / Math.LN2) + 1;\n\n\t\t\tthis.url = this.url.substr(0, this.url.lastIndexOf(\"/\"));\n\n\t\t\tthis.getTileURL = (url, x, y, level) => {\n\t\t\t\tlet ilevel = parseInt(this.nlevels - 1 - level);\n\t\t\t\tlet index = this.index(level, x, y)>>>0;\n\t\t\t\tlet group = index >> 8;\n\t\t\t\turl = url.substr(0, url.lastIndexOf(\"/\"));\n\t\t\t\treturn this.url + \"/TileGroup\" + group + \"/\" + ilevel + \"-\" + x + \"-\" + y + \".\" + this.suffix;\n\t\t\t};\n\n\t\t\tcallback();\n\n\t\t})().catch(e => { console.log(e); this.status = e; });\n\t}\n}\n\n\n\n\n//# sourceURL=webpack:///./src/Layout.js?");

/***/ }),

/***/ "./src/OpenLIME.js":
/*!*************************!*\
  !*** ./src/OpenLIME.js ***!
  \*************************/
/*! exports provided: OpenLIME, Canvas, Camera, Transform, Layer, Raster, Shader, Layout */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"OpenLIME\", function() { return OpenLIME; });\n/* harmony import */ var _Canvas_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Canvas.js */ \"./src/Canvas.js\");\n/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, \"Canvas\", function() { return _Canvas_js__WEBPACK_IMPORTED_MODULE_0__[\"Canvas\"]; });\n\n/* harmony import */ var _Camera_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./Camera.js */ \"./src/Camera.js\");\n/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, \"Camera\", function() { return _Camera_js__WEBPACK_IMPORTED_MODULE_1__[\"Camera\"]; });\n\n/* harmony import */ var _Transform_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./Transform.js */ \"./src/Transform.js\");\n/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, \"Transform\", function() { return _Transform_js__WEBPACK_IMPORTED_MODULE_2__[\"Transform\"]; });\n\n/* harmony import */ var _Layer_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./Layer.js */ \"./src/Layer.js\");\n/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, \"Layer\", function() { return _Layer_js__WEBPACK_IMPORTED_MODULE_3__[\"Layer\"]; });\n\n/* harmony import */ var _Layout_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./Layout.js */ \"./src/Layout.js\");\n/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, \"Layout\", function() { return _Layout_js__WEBPACK_IMPORTED_MODULE_4__[\"Layout\"]; });\n\n/* harmony import */ var _Raster_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./Raster.js */ \"./src/Raster.js\");\n/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, \"Raster\", function() { return _Raster_js__WEBPACK_IMPORTED_MODULE_5__[\"Raster\"]; });\n\n/* harmony import */ var _Shader_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./Shader.js */ \"./src/Shader.js\");\n/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, \"Shader\", function() { return _Shader_js__WEBPACK_IMPORTED_MODULE_6__[\"Shader\"]; });\n\n/* harmony import */ var _Controller_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./Controller.js */ \"./src/Controller.js\");\n/* harmony import */ var _PanZoomController_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./PanZoomController.js */ \"./src/PanZoomController.js\");\n\n\n\n\n\n\n\n\n\n\n\n/**\n * Manages an OpenLIME viewer functionality on a canvas\n * how do I write more substantial documentation.\n *\n * @param {div} div of the DOM or selector (es. '#canvasid'), or a canvas.\n * @param {string} options is a url to a JSON describing the viewer content\n * @param {object} options is a JSON describing the viewer content\n *  * **animate**: default *true*, calls requestAnimation() and manages refresh.\n *  * test:\n */\n\nclass OpenLIME {\n\n\tconstructor(div, options) {\n\n\t\tObject.assign(this, { \n\t\t\tbackground: [0, 0, 0, 1],\n\t\t\tcanvas: {},\n\t\t\tcamera: new _Camera_js__WEBPACK_IMPORTED_MODULE_1__[\"Camera\"]()\n\t\t});\n\n\n\t\tif(typeof(div) == 'string')\n\t\t\tdiv = document.querySelector(div);\n\n\t\tif(!div)\n\t\t\tthrow \"Missing element parameter\";\n\n\t\tthis.containerElement = div;\n\t\tthis.canvasElement = div.querySelector('canvas');\n\t\tif(!this.canvasElement) {\n\t\t\tthis.canvasElement = document.createElement('canvas');\n\t\t\tdiv.appendChild(this.canvasElement);\n\t\t}\n\n\t\tthis.initCanvasElement(this.canvasElement);\n\n\n\t\tthis.canvas = new _Canvas_js__WEBPACK_IMPORTED_MODULE_0__[\"Canvas\"](this.gl, this.camera, this.canvas);\n\t\tthis.canvas.addEvent('update', () => { this.redraw(); });\n\n\t\tthis.camera.addEvent('update', () => { this.redraw(); });\n\n\t\tthis.controller = new _PanZoomController_js__WEBPACK_IMPORTED_MODULE_8__[\"PanZoomController\"](this.containerElement, this.camera);\n\n\t\tvar resizeobserver = new ResizeObserver( entries => {\n\t\t\tfor (let entry of entries) {\n\t\t\t\tthis.resize(entry.contentRect.width, entry.contentRect.height);\n\t\t\t}\n\t\t});\n\t\tresizeobserver.observe(this.canvasElement);\n\n\t\tthis.resize(this.canvasElement.clientWidth, this.canvasElement.clientHeight);\n\n/*\n//TODO here is not exactly clear which assumption we make on canvas and container div size.\n//\t\tresizeobserver.observe(this.containerElement);\n\t\tthis.containerElement.addEventListener('mousemove', (e) => {\n\n//\t\t\tlet camera = this.canvas.camera;\n//\t\t\tlet x = e.clientX - this.canvas.camera.viewport[2]/2;\n//\t\t\tlet y = e.clientY - this.canvas.camera.viewport[3]/2;\n//\t\t\tlet z = this.canvas.camera.target.z;\n//\t\t\tcamera.setPosition(0, x/z, y/z, z, 0,); \n\n//\t\t\tconsole.log(camera.mapToScene(e.clientX, e.clientY, camera.target));\n//\t\t\tthis.canvas.camera.target.x = 1;\n//\t\t\tthis.canvas.camera.target.t = performance.now();\n\t\t\tthis.redraw();\n//\t\t\tthis.canvas.camera.target.x += 1;\n\t\t}); */\n\n\n\t}\n\n\n\tinitCanvasElement(canvas) {\n\t\tif(!canvas)\n\t\t\tthrow \"Missing element parameter\"\n\n\t\tif(typeof(canvas) == 'string') {\n\t\t\tcanvas = document.querySelector(canvas);\n\t\t\tif(!canvas)\n\t\t\t\tthrow \"Could not find dom element.\";\n\t\t}\n\n\t\tif(!canvas.tagName)\n\t\t\tthrow \"Element is not a DOM element\"\n\n\t\tif(canvas.tagName != \"CANVAS\")\n\t\t\tthrow \"Element is not a canvas element\";\n\n\n\t\tlet glopt = { antialias: false, depth: false, preserveDrawingBuffer: this.preserveDrawingBuffer };\n\t\tthis.gl = this.gl || \n\t\t\tcanvas.getContext(\"webgl2\", glopt) || \n\t\t\tcanvas.getContext(\"webgl\", glopt) || \n\t\t\tcanvas.getContext(\"experimental-webgl\", glopt) ;\n\n\t\tif (!this.gl)\n\t\t\tthrow \"Could not create a WebGL context\";\n\t}\n\n\t/**\n\t* Resize the canvas (and the overlay) and triggers a redraw.\n\t*/\n\n\tresize(width, height) {\n\t\tthis.canvasElement.width = width;\n\t\tthis.canvasElement.height = height;\n\n\t\tthis.camera.setViewport({x:0, y:0, dx:width, dy:height, w:width, h:height});\n\t\tthis.canvas.prefetch();\n\t\tthis.redraw();\n\t}\n\n\t/**\n\t*\n\t* Schedule a drawing.\n\t*/\n\tredraw() {\n\t\tif(this.animaterequest) return;\n\t\tthis.animaterequest = requestAnimationFrame( (time) => { this.draw(time); });\n\t}\n\n\t/**\n\t* Do not call this if OpenLIME is animating, use redraw()\n\t* @param {time} time as in performance.now()\n\t*/\n\tdraw(time) {\n\t\tif(!time) time = performance.now();\n\t\tthis.animaterequest = null;\n\n\t\tlet done = this.canvas.draw(time);\n\t\tif(!done)\n\t\t\tthis.redraw();\n\t}\n\n\tfit(box, dt, size) {\n\t\tthis.camera.fit(box, dt, size);\n\t\tthis.redraw();\n\t}\n}\n\n\n\n\n\n//# sourceURL=webpack:///./src/OpenLIME.js?");

/***/ }),

/***/ "./src/PanZoomController.js":
/*!**********************************!*\
  !*** ./src/PanZoomController.js ***!
  \**********************************/
/*! exports provided: PanZoomController */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"PanZoomController\", function() { return PanZoomController; });\n/* harmony import */ var _Controller_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Controller.js */ \"./src/Controller.js\");\n/* harmony import */ var _Camera_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./Camera.js */ \"./src/Camera.js\");\n\n\n\nclass PanZoomController extends _Controller_js__WEBPACK_IMPORTED_MODULE_0__[\"Controller\"] {\n\n\tconstructor(element, camera, options) {\n\t\tsuper(element, options);\n\t\tthis.camera = camera;\n\t\tthis.zoomAmount = 1.2;\n\t\tthis.panning = false;\n\t\tthis.startPosition = null;\n\t\tthis.startMouse = null;\n\t}\n\n\tmouseDown(x, y, e) {\n\t\tif(!(e.buttons & 0x1)) \n\t\t\treturn;\n\t\tthis.panning = true; \n\t\tthis.startMouse = { x: x, y: y };\n\n\t\tlet now = performance.now();\n\t\tthis.startPosition = this.camera.getCurrentTransform(now);\n\t\tthis.camera.target = this.startPosition.copy(); //stop animation.\n\t}\n\n\tmouseUp(x, y, e) { \n\t\tthis.panning = false;\n\t}\n\n\tmouseMove(x, y, e) { \n\t\tif(!this.panning)\n\t\t\treturn;\n\n\t\tlet dx = x - this.startMouse.x;\n\t\tlet dy = y - this.startMouse.y;\n\n\n\t\tlet z = this.startPosition.z;\n\t\tlet ex = this.startPosition.x + dx/z;\n\t\tlet ey = this.startPosition.y + dy/z;\n\t\tlet a = this.startPosition.a;\n\n\n\t\tthis.camera.setPosition(this.delay, ex, ey, z, a);\n\t}\n\n\twheelDelta(x, y, delta, e) { \n\t\tlet pos = this.camera.mapToScene(x, y, this.camera.getCurrentTransform(performance.now()));\n\t\tlet zoom = Math.pow(this.zoomAmount, delta);\n\t\tthis.camera.zoom(this.delay, zoom, pos.x, pos.y, );\n\t}\n\n\tpinchStart(pos1, pos2, e) {if(this.debug) console.log('TODO! Start ', pos1, pos2); }\n\n\tpinchMove(pos1, pos2, e) {if(this.debug) console.log('TODO! Move ', pos1, pos2); }\n\n}\n\n\n\n\n//# sourceURL=webpack:///./src/PanZoomController.js?");

/***/ }),

/***/ "./src/Raster.js":
/*!***********************!*\
  !*** ./src/Raster.js ***!
  \***********************/
/*! exports provided: Raster */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"Raster\", function() { return Raster; });\n/**\n * Raster is a providers of images and planes of coefficies.\n * It support all files format supported by browser and a set of tiled formats.\n *\n * Layout can be:\n * * image: a single image (.jpg, .png etc.)\n * * google: there is no config file, so layout, suffix is mandatory if not .jpg,  and url is the base folder of the tiles.\n * * deepzoom: requires only url, can be autodetected from the extension (.dzi)\n * * zoomify: requires url, can be autodetected, from the ImageProperties.xml, suffix is required if not .jpg\n * * iip: requires url, can be autodetected from the url\n * * iiif: layout is mandatory, url should point to base url {scheme}://{server}{/prefix}/{identifier}\n *\n * @param {string} id an unique id for each raster\n * @param {url} url of the content\n * @param {object} options \n * * *type*: vec3 (default value) for standard images, vec4 when including alpha, vec2, float other purpouses.\n * * *attribute*: <coeff|kd|ks|gloss|normals|dem> meaning of the image.\n * * *colorSpace*: <linear|srgb> colorspace used for rendering.\n */\n\nclass Raster {\n\n\tconstructor(options) {\n\n\t\tObject.assign(this, { \n\t\t\ttype: 'vec3', \n\t\t\tcolorSpace: 'linear',\n\t\t\tattribute: 'kd'\n\t\t });\n\n\t\tObject.assign(this, options);\n\t}\n\n\n\tloadImage(url, gl, callback) {\n\t\t(async () => {\n\t\t\tvar response = await fetch(url);\n\t\t\tif(!response.ok) {\n\t\t\t\tconsole.log();\n\t\t\t\tcallback(\"Failed loading \" + url + \": \" + response.statusText);\n\t\t\t\treturn;\n\t\t\t}\n\n\t\t\tlet blob = await response.blob();\n\n\t\t\tif(typeof createImageBitmap != 'undefined') {\n\t\t\t\tvar isFirefox = typeof InstallTrigger !== 'undefined';\n\t\t\t\t//firefox does not support options for this call, BUT the image is automatically flipped.\n\t\t\t\tif(isFirefox) {\n\t\t\t\t\tcreateImageBitmap(blob).then((img) => this.loadTexture(gl, img, callback));\n\t\t\t\t} else {\n\t\t\t\t\tcreateImageBitmap(blob, { imageOrientation1: 'flipY' }).then((img) => this.loadTexture(gl, img, callback));\n\t\t\t\t}\n\n\t\t\t} else { //fallback for IOS\n\t\t\t\tvar urlCreator = window.URL || window.webkitURL;\n\t\t\t\tvar img = document.createElement('img');\n\t\t\t\timg.onerror = function(e) { console.log(\"Texture loading error!\"); };\n\t\t\t\timg.src = urlCreator.createObjectURL(blob);\n\n\t\t\t\timg.onload = function() {\n\t\t\t\t\turlCreator.revokeObjectURL(img.src);\n\n\n\t\t\t\t\tthis.loadTexture(gl, img, callback);\n\t\t\t\t}\n\t\t\t}\n\t\t})().catch(e => { callback(null); });\n\t}\n\n\tloadTexture(gl, img, callback) {\n\t\tthis.width = img.width;  //this will be useful for layout image.\n\t\tthis.height = img.height;\n\n\t\tvar tex = gl.createTexture();\n\t\tgl.bindTexture(gl.TEXTURE_2D, tex);\n\t\tgl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);\n\t\tgl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); //_MIPMAP_LINEAR);\n\t\tgl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);\n\t\tgl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);\n\t\tgl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);\n\t\tcallback(tex);\n\t}\n\n}\n\n\n\n\n//# sourceURL=webpack:///./src/Raster.js?");

/***/ }),

/***/ "./src/Shader.js":
/*!***********************!*\
  !*** ./src/Shader.js ***!
  \***********************/
/*! exports provided: Shader */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"Shader\", function() { return Shader; });\n\n/**\n *  @param {object} options\n * *label*: used for menu\n * *samplers*: array of rasters {id:, type: } color, normals, etc.\n * *uniforms*:\n * *body*: code actually performing the rendering, needs to return a vec4\n * *name*: name of the body function\n */\n\nclass Shader {\n\tconstructor(options) {\n\t\tObject.assign(this, {\n\t\t\tversion: 100,   //check for webglversion.\n\t\t\tsamplers: [],\n\t\t\tuniforms: {},\n\t\t\tname: \"\",\n\t\t\tbody: \"\",\n\t\t\tprogram: null,      //webgl program\n\t\t\tneedsUpdate: true\n\t\t});\n\n\t\tObject.assign(this, options);\n\t}\n\n\tcreateProgram(gl) {\n\n\t\tlet vert = gl.createShader(gl.VERTEX_SHADER);\n\t\tgl.shaderSource(vert, this.vertShaderSrc(100));\n\n\t\tgl.compileShader(vert);\n\t\tlet compiled = gl.getShaderParameter(vert, gl.COMPILE_STATUS);\n\t\tif(!compiled) {\n\t\t\tconsole.log(gl.getShaderInfoLog(vert));\n\t\t\tthrow Error(\"Failed vertex shader compilation: see console log and ask for support.\");\n\t\t}\n\n\t\tlet frag = gl.createShader(gl.FRAGMENT_SHADER);\n\t\tgl.shaderSource(frag, this.fragShaderSrc());\n\t\tgl.compileShader(frag);\n\n\t\tif(this.program)\n\t\t\tgl.deleteProgram(this.program);\n\n\t\tlet program = gl.createProgram();\n\n\t\tgl.getShaderParameter(frag, gl.COMPILE_STATUS);\n\t\tcompiled = gl.getShaderParameter(frag, gl.COMPILE_STATUS);\n\t\tif(!compiled) {\n\t\t\tconsole.log(this.fragShaderSrc())\n\t\t\tconsole.log(gl.getShaderInfoLog(frag));\n\t\t\tthrow Error(\"Failed fragment shader compilation: see console log and ask for support.\");\n\t\t}\n\n\t\tgl.attachShader(program, vert);\n\t\tgl.attachShader(program, frag);\n\t\tgl.linkProgram(program);\n\n\t\tif ( !gl.getProgramParameter( program, gl.LINK_STATUS) ) {\n\t\t\tvar info = gl.getProgramInfoLog(program);\n\t\t\tthrow new Error('Could not compile WebGL program. \\n\\n' + info);\n\t\t}\n\n\t\t//sampler units;\n\t\tfor(let sampler of this.samplers)\n\t\t\tsampler.location = gl.getUniformLocation(program, sampler.name);\n\n\t\tthis.coordattrib = gl.getAttribLocation(program, \"a_position\");\n\t\tgl.vertexAttribPointer(this.coordattrib, 3, gl.FLOAT, false, 0, 0);\n\t\tgl.enableVertexAttribArray(this.coordattrib);\n\n\t\tthis.texattrib = gl.getAttribLocation(program, \"a_texcoord\");\n\t\tgl.vertexAttribPointer(this.texattrib, 2, gl.FLOAT, false, 0, 0);\n\t\tgl.enableVertexAttribArray(this.texattrib);\n\n\t\tthis.matrixlocation = gl.getUniformLocation(program, \"u_matrix\");\n\n\t\tthis.program = program;\n\t\tthis.needsUpdate = false;\n\t}\n\n\tvertShaderSrc() {\n\t\treturn `#version 300 es\n\nprecision highp float; \nprecision highp int; \n\nuniform mat4 u_matrix;\nin vec4 a_position;\nin vec2 a_texcoord;\n\nout vec2 v_texcoord;\n\nvoid main() {\n\tgl_Position = u_matrix * a_position;\n\tv_texcoord = a_texcoord;\n}`;\n\t}\n\n\tfragShaderSrc() {\n\t\treturn this.body;\n\t}\n}\n\n\n\n\n\n//# sourceURL=webpack:///./src/Shader.js?");

/***/ }),

/***/ "./src/ShaderCombiner.js":
/*!*******************************!*\
  !*** ./src/ShaderCombiner.js ***!
  \*******************************/
/*! exports provided: ShaderCombiner */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"ShaderCombiner\", function() { return ShaderCombiner; });\n/* harmony import */ var _Shader_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Shader.js */ \"./src/Shader.js\");\n\n\n/**\n *  @param {object} options\n * *compose*: compose operation: add, subtract, multiply, etc.\n */\n\nclass ShaderCombiner extends _Shader_js__WEBPACK_IMPORTED_MODULE_0__[\"Shader\"] {\n\tconstructor(options) {\n\t\tsuper(options);\n\n\t\tthis.mode = 'diff', //Lighten Darken Contrast Inversion HSV components LCh components\n\t\tthis.samplers = [\n\t\t\t{ id:0, name:'source1', type:'vec3' },\n\t\t\t{ id:1, name:'source2', type:'vec3' }\n\t\t];\n\n\t\tthis.modes = {\n\t\t\t'first': 'color = c1;',\n\t\t\t'second': 'color = c2;',\n\t\t\t'mean': 'color = (c1 + c2)/2.0;',\n\t\t\t'diff': 'color = vec4(c2.rgb - c1.rgb, c1.a);'\n\t\t};\n\n\t\tthis.body = this.template(this.modes[this.mode]);\n\t}\n\n\tsetMode(mode) {\n\t\tif(!(mode in this.modes))\n\t\t\tthrow Error(\"Unknown mode: \" + mode);\n\t\tthis.body = this.template(this.modes[mode]);\n\t\tthis.needsUpdate = true;\n\t}\n\n\ttemplate(operation) {\n\t\t\treturn  `#version 300 es\n\nprecision highp float; \nprecision highp int; \n\nin vec2 v_texcoord;\n\nuniform sampler2D source1;\nuniform sampler2D source2;\n\nout vec4 color;\n\nvoid main() {\n\tvec4 c1 = texture(source1, v_texcoord);\n\tvec4 c2 = texture(source2, v_texcoord);\n\t${operation};\n}\n`;\n\t}\n\n\tvertShaderSrc() {\n\t\treturn `#version 300 es\n\nprecision highp float; \nprecision highp int; \n\nin vec4 a_position;\nin vec2 a_texcoord;\n\nout vec2 v_texcoord;\n\nvoid main() {\n\tgl_Position = a_position;\n\tv_texcoord = a_texcoord;\n}`;\n\t}\n}\n\n\n\n\n\n//# sourceURL=webpack:///./src/ShaderCombiner.js?");

/***/ }),

/***/ "./src/Transform.js":
/*!**************************!*\
  !*** ./src/Transform.js ***!
  \**************************/
/*! exports provided: Transform, matMul */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"Transform\", function() { return Transform; });\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"matMul\", function() { return matMul; });\n\n/**\n * \n * @param {number} x position\n * @param {number} y position\n * @param {number} z scale\n * @param {number} a rotation\n * @param {number} t time\n *\n */\n\nclass Transform {\n\tconstructor(x, y, z, a, t) {\n\t\tObject.assign(this, { x:0, y:0, z:1, a:0, t:0 });\n\n\t\tif(!t) t = performance.now();\n\n\t\tif(typeof(x) == 'object')\n\t\t\tObject.assign(this, x);\n\t\telse if(typeof(x) != 'undefined') \n\t\t\tObject.assign(this, { x:x, y:y, z:z, a:a, t:t });\n\t}\n\n\tcopy() {\n\t\tlet transform = new Transform();\n\t\tObject.assign(transform, this);\n\t\treturn transform;\n\t}\n\n\tapply(x, y) {\n\t\t//TODO! ROTATE\n\t\tlet r = this.rotate(x, y, this.a);\n\t\treturn { \n\t\t\tx: r.x*this.z + this.x,\n\t\t\ty: r.y*this.z + this.y\n\t\t}\n\t}\n\n\tinverse() {\n\t\tlet r = this.rotate(this.x, this.y, -this.a);\n\t\treturn new Transform(r.x, r.y, 1/this.z, -this.a, this.t);\n\t}\n\n\trotate(x, y, angle) {\n\t\tvar angle = Math.PI*(angle/180);\n\t\tvar x =  Math.cos(angle)*x + Math.sin(angle)*y;\n\t\tvar y = -Math.sin(angle)*x + Math.cos(angle)*y;\n\t\treturn {x:x, y:y};\n\t}\n\n\tcompose(transform) {\n\t\tlet a = this.copy();\n\t\tlet b = transform;\n\t\ta.z *= b.z;\n\t\ta.a += b.a;\n\t\tvar r = this.rotate(a.x, a.y, b.a);\n\t\ta.x = r.x*b.z + b.x;\n\t\ta.y = r.y*b.z + b.y; \n\t\treturn a;\n\t}\n\n/*  get the bounding box (in image coordinate sppace) of the vieport. \n */\n\tgetInverseBox(viewport) {\n\t\tlet inverse = this.inverse();\n\t\tlet corners = [\n\t\t\t{x:viewport.x,               y:viewport.y},\n\t\t\t{x:viewport.x + viewport.dx, y:viewport.y},\n\t\t\t{x:viewport.x,               y:viewport.y + viewport.dy},\n\t\t\t{x:viewport.x + viewport.dx, y:viewport.y + viewport.dy}\n\t\t];\n\t\tlet box = [ 1e20, 1e20, -1e20, -1e20];\n\t\tfor(let corner of corners) {\n\t\t\tlet p = inverse.apply(corner.x -viewport.w/2, corner.y - viewport.h/2);\n\t\t\tbox[0] = Math.min(p.x, box[0]);\n\t\t\tbox[1] = Math.min(p.y, box[1]);\n\t\t\tbox[2] = Math.max(p.x, box[2]);\n\t\t\tbox[3] = Math.max(p.y, box[3]);\n\t\t}\n\t\treturn box;\n\t}\n\n\tinterpolate(source, target, time) {\n\t\tif(time < source.t) return source;\n\t\tif(time > target.t) return target;\n\n\t\tlet t = (target.t - source.t);\n\t\tif(t < 0.0001) {\n\t\t\tObject.assign(this, target);\n\t\t\treturn;\n\t\t}\n\n\t\tlet tt = (time - source.t)/t;\n\t\tlet st = (target.t - time)/t;\n\n\t\tfor(let i of ['x', 'y', 'z', 'a'])\n\t\t\tthis[i] = (st*source[i] + tt*target[i]);\n\t\tthis.t = time;\n\t}\n\n\n\n\n/**\n *  Combines the transform with the viewport to the viewport with the transform\n * @param {Object} transform a {@link Transform} class.\n */\n\tprojectionMatrix(viewport) {\n\t\tlet z = this.z;\n\t\tlet zx = 2*z/viewport.w;\n\t\tlet zy = 2*z/viewport.h;\n\n\t\tlet dx = (this.x)*zx;\n\t\tlet dy = -(this.y)*zy;\n\n\t\tlet matrix = [\n\t\t\t zx,  0,  0,  0, \n\t\t\t 0,  zy,  0,  0,\n\t\t\t 0,  0,  1,  0,\n\t\t\tdx, dy, 0,  1];\n\t\treturn matrix;\n\t}\n\n/**\n * TODO (if needed)\n */ \n\ttoMatrix() {\n\t\tlet z = this.z;\n\t\treturn [\n\t\t\tz,   0,   0,   0,\n\t\t\t0,   z,   0,   0, \n\t\t\t0,   0,   1,   0,\n\t\t\tz*x, z*y, 0,   1,\n\t\t];\n\t}\n\n}\n\nfunction matrixMul(a, b) {\n\tlet r = new Array(16);\n\tfor (let i = 0; i < 4; i++) {\n\t\tfor (let j = 0; j < 4; j++) {\n\t\t\tr[j + i*4] = 0;\n\t\t\tfor (let k = 0; k < N; k++) {\n\t\t\t\tr[j + i*4] += a[k + i*4]*b[k + j*4]\n\t\t\t}\n\t\t}\n\t}\n\treturn r;\n}\n\nfunction matMul(a, b) {\n\tlet r = new Array(16);\n\tr[ 0] = a[0]*b[0] + a[4]*b[1] + a[8]*b[2] + a[12]*b[3];\n\tr[ 1] = a[1]*b[0] + a[5]*b[1] + a[9]*b[2] + a[13]*b[3];\n\tr[ 2] = a[2]*b[0] + a[6]*b[1] + a[10]*b[2] + a[14]*b[3];\n\tr[ 3] = a[3]*b[0] + a[7]*b[1] + a[11]*b[2] + a[15]*b[3];\n\n\tr[ 4] = a[0]*b[4] + a[4]*b[5] + a[8]*b[6] + a[12]*b[7];\n\tr[ 5] = a[1]*b[4] + a[5]*b[5] + a[9]*b[6] + a[13]*b[7];\n\tr[ 6] = a[2]*b[4] + a[6]*b[5] + a[10]*b[6] + a[14]*b[7];\n\tr[ 7] = a[3]*b[4] + a[7]*b[5] + a[11]*b[6] + a[15]*b[7];\n\n\tr[ 8] = a[0]*b[8] + a[4]*b[9] + a[8]*b[10] + a[12]*b[11];\n\tr[ 9] = a[1]*b[8] + a[5]*b[9] + a[9]*b[10] + a[13]*b[11];\n\tr[10] = a[2]*b[8] + a[6]*b[9] + a[10]*b[10] + a[14]*b[11];\n\tr[11] = a[3]*b[8] + a[7]*b[9] + a[11]*b[10] + a[15]*b[11];\n\n\tr[12] = a[0]*b[12] + a[4]*b[13] + a[8]*b[14] + a[12]*b[15];\n\tr[13] = a[1]*b[12] + a[5]*b[13] + a[9]*b[14] + a[13]*b[15];\n\tr[14] = a[2]*b[12] + a[6]*b[13] + a[10]*b[14] + a[14]*b[15];\n\tr[15] = a[3]*b[12] + a[7]*b[13] + a[11]*b[14] + a[15]*b[15];\n\treturn r;\n}\n\n\n\n\n//# sourceURL=webpack:///./src/Transform.js?");

/***/ }),

/***/ "./src/index.js":
/*!**********************!*\
  !*** ./src/index.js ***!
  \**********************/
/*! no exports provided */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _OpenLIME_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./OpenLIME.js */ \"./src/OpenLIME.js\");\n/* harmony import */ var _Raster_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./Raster.js */ \"./src/Raster.js\");\n/* harmony import */ var _Layer_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./Layer.js */ \"./src/Layer.js\");\n/* harmony import */ var _LayerImage_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./LayerImage.js */ \"./src/LayerImage.js\");\n/* harmony import */ var _LayerCombiner_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./LayerCombiner.js */ \"./src/LayerCombiner.js\");\n\n\n\n\n\n\nlet lime = new _OpenLIME_js__WEBPACK_IMPORTED_MODULE_0__[\"OpenLIME\"]('#openlime');\n\n\n\n//combinerTest();\nimageTest('google');\n\n\n\n/* COMBINER TEST */\nfunction combinerTest() {\n\n\tlet layer0 = new _Layer_js__WEBPACK_IMPORTED_MODULE_2__[\"Layer\"]({ \n\t\ttype:'image',\n\t\turl: 'assets/svbrdf/vis/kdMap.jpg',\n\t\tlayout: 'image',\n\t\tzindex:0,\n\t\ttransform: {x:0, y:0, z:1, a:0 },\n\t\tvisible:true\n\t});\n\n\tlet layer1 = new _Layer_js__WEBPACK_IMPORTED_MODULE_2__[\"Layer\"]({ \n\t\ttype:'image',\n\t\turl: 'assets/svbrdf/vis/ksMap.jpg',\n\t\tlayout: 'image',\n\t\tzindex:0,\n\t\ttransform: {x:0, y:0, z:1, a:0 },\n\t\tvisible:false\n\t});\n\n\tlet combiner = new _LayerCombiner_js__WEBPACK_IMPORTED_MODULE_4__[\"LayerCombiner\"]({\n\t\tlayers: [layer0, layer1 ]\n\t});\n\tlime.canvas.addLayer('kdmap', layer0);\n\tlime.canvas.addLayer('ksmap', layer1);\n\tlime.canvas.addLayer('combiner', combiner);\n}\n\n\n\n/* IMAGE TEST */\nfunction imageTest(layout) {\n\tif(!layout)\n\t\tlayout = 'image';\n\n\tlet options = { 'layout': layout, 'type':'image' };\n\tconsole.log(options);\n\tswitch(layout) {\n\t\tcase 'image':\n\t\t\toptions.url = 'assets/svbrdf/vis/glossMap.jpg';\n\t\t\tbreak;\n\n\t\tcase 'deepzoom': \n\t\t\toptions.url = 'assets/svbrdf/vis/ksMap.dzi';\n\t\t\tbreak;\n\n\t\tcase 'google':\n\t\t\toptions.width = 300;\n\t\t\toptions.height = 553;\n\t\t\toptions.url = 'assets/svbrdf/vis/kdMap';\n\t\t\tbreak;\n\n\t\tcase 'zoomify':\n\t\t\toptions.url = 'assets/svbrdf/vis/glossMap/ImageProperties.xml';\n\t\t\tbreak;\n\t}\n\tconsole.log(options);\n\tlet layer0 = new _Layer_js__WEBPACK_IMPORTED_MODULE_2__[\"Layer\"](options);\n\tlime.canvas.addLayer('kdmap', layer0); \n}\n\n\n/* BRDF TEST */\nfunction brdfTest() {\n\tlet brdf = new _Layer_js__WEBPACK_IMPORTED_MODULE_2__[\"Layer\"]({ \n\t\ttype:'brdf',\n\t\tchannels: {\n\t\t\t'kd':      'assets/svbrdf/vis/kdMap.jpg',\n\t\t\t'ks':      'assets/svbrdf/vis/ksMap.jpg',\n\t\t\t'normals': 'assets/svbrdf/normalMap_rotated.jpg',\n\t\t\t'gloss':   'assets/svbrdf/vis/glossMap.jpg'\n\t\t},\n\t\tlayout: 'image',\n\t}); \n\n\tlime.canvas.addLayer('brdf', brdf);\n}\n\n\nlime.draw();\nlime.canvas.camera.fit([-500, -500, +500, +500]);\nlime.canvas.camera.fit([-500, -500, +500, +500], 1000);\n\nsetTimeout(() => { lime.fit([-150, -276, 150, 277], 200); }, 1000);\n\n\n\n\n\n//# sourceURL=webpack:///./src/index.js?");

/***/ })

/******/ });