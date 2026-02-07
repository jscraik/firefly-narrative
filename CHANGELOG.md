# Changelog

## [0.3.1](https://github.com/jscraik/narrative/compare/narrative-desktop-mvp-v0.3.0...narrative-desktop-mvp-v0.3.1) (2026-02-07)


### Bug Fixes

* **ci:** trigger release workflow for release-please tags ([af7e414](https://github.com/jscraik/narrative/commit/af7e414e0cdf99f992142956f5642855449a380c))

## [0.3.0](https://github.com/jscraik/narrative/compare/narrative-desktop-mvp-v0.2.0...narrative-desktop-mvp-v0.3.0) (2026-02-07)


### Features

* add analytics dashboard with drill-down navigation ([cba4184](https://github.com/jscraik/narrative/commit/cba41844be69b373363faad42dfa3dce47480ef9))
* add attribution notes metadata and CI icons ([91b1938](https://github.com/jscraik/narrative/commit/91b1938b11b3ec7accc70b85519c67a297b7aacb))
* Add Docs panel with Mermaid diagram support ([39f35e4](https://github.com/jscraik/narrative/commit/39f35e481ba14bdab24b61c5524f5604fcc70e15))
* add getTraceBadgeLabel helper for trace badges ([f3a7589](https://github.com/jscraik/narrative/commit/f3a7589fa93593ea45d433b17ec50b84e9494c88))
* complete session-to-commit linking MVP v1 ([64e8f5d](https://github.com/jscraik/narrative/commit/64e8f5d3ae97f3cb79d7e760304ae028f38499a7))
* Complete Tauri auto-updater implementation ([4055243](https://github.com/jscraik/narrative/commit/4055243a430243ad8f140a4eae85ff7a3d0445e2))
* docs linting + agent trace updates ([a3fccd2](https://github.com/jscraik/narrative/commit/a3fccd2cc9571937c8b2c5983e577852c6e17927))
* enable auto-updates, add Docs view with auto-repo-load, add release script ([b197dc1](https://github.com/jscraik/narrative/commit/b197dc1dea90b5fa1b6cb1f8cc819f36c66a518d))
* implement narrative version control v1.0 UI/UX improvements ([25de5ee](https://github.com/jscraik/narrative/commit/25de5ee0623e4c40d8b243d9352b669783213102))
* import JUnit test runs + mentioned-files UX ([8995b69](https://github.com/jscraik/narrative/commit/8995b6950842e04cc58829fe7b520e14e269ce08))


### Bug Fixes

* Add icon field to tauri.conf.json bundle configuration ([29a8bbd](https://github.com/jscraik/narrative/commit/29a8bbd227179e323c7ebd226ec18f7cdda2763e))
* **ci:** repair Release workflow rust toolchain and tag input ([3894251](https://github.com/jscraik/narrative/commit/3894251b30e5542d739c9e9a117ad1307bc28eb6))
* Disable auto-update check on launch (GitHub releases not ready yet) ([afca4f8](https://github.com/jscraik/narrative/commit/afca4f81e3c63b6cc4c40a484be2afff2356b6ce))
* Explicitly configure bundle targets to include DMG for macOS ([32c618b](https://github.com/jscraik/narrative/commit/32c618bd8793fb022c97e6bcdda64c3d44ef585f))
* improve error messages in secure_parser with expect() calls ([c11cdfa](https://github.com/jscraik/narrative/commit/c11cdfa2f1963968fce0414ce8b9bb7323bf4f4b))
* Improve release workflow with better caching and build steps ([ccc347a](https://github.com/jscraik/narrative/commit/ccc347a2bad44854701dc92e932a1446e8409389))
* **JSC-10:** refactor monolithic SourceLensView component ([9fea1c7](https://github.com/jscraik/narrative/commit/9fea1c74e2b88b41b9530b6ec1c54054983ad85f))
* JSC-11 add API key auth and rate limiting to OTLP receiver ([9c71fc5](https://github.com/jscraik/narrative/commit/9c71fc591b213c01ea78d31b4c0e0d0ecf46a555))
* **JSC-12:** refactor monolithic Timeline component ([e01573d](https://github.com/jscraik/narrative/commit/e01573d468aa819c947eadd068b651cda5dce12e))
* JSC-13 race condition in OTLP receiver startup ([24ad10b](https://github.com/jscraik/narrative/commit/24ad10b77c4688c00b04227fc3449f14b02ed049))
* JSC-14 silent failures in otlp_receiver error handling ([783449a](https://github.com/jscraik/narrative/commit/783449a5712cd5105204e68fa04c416fd75172c2))
* JSC-9 memory leak in diff cache with LRU cache ([5069e87](https://github.com/jscraik/narrative/commit/5069e87c3537d9f979a31fbce3631e21e624d550))
* **release:** handle case where version is already updated ([47fb50f](https://github.com/jscraik/narrative/commit/47fb50fb61a6823320f00d09f32465eee43794f9))
* remove committed artifacts and use app data dir for db ([9d61624](https://github.com/jscraik/narrative/commit/9d61624aed4476a585815e53230936f7366f44c4))
* replace runtime panics and add error logging ([3f4a3f3](https://github.com/jscraik/narrative/commit/3f4a3f3c9a0c5c9c15c419f8ff86d4fc3d7480f1))
* resolve blank window on app startup and fix linting issues ([97db77a](https://github.com/jscraik/narrative/commit/97db77a9558518e73a3491c348add158dec95923))
* resolve Tauri parameter naming mismatch ([31e9dbe](https://github.com/jscraik/narrative/commit/31e9dbef07f4401cf491f492798e0240480a5432))
* tighten otlp auth and repo loading ([aaea3c8](https://github.com/jscraik/narrative/commit/aaea3c837463def8b42daaa21515658a97111303))
* Use correct Tauri command names for Docs panel ([f6d4909](https://github.com/jscraik/narrative/commit/f6d49095641f03f31c20246d96668aab723cc69b))
* Wire up Docs panel to sync with opened repo ([3d31131](https://github.com/jscraik/narrative/commit/3d311314b4d340dec0eebf95c6048a7f6b2e7674))

## Changelog

All notable changes to Narrative MVP will be documented in this file.

This project uses automated release notes (Release Please). Human edits are OK,
but release notes should remain accurate and reflect what shipped.

## Unreleased

- (pending)
