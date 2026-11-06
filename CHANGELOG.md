# Changelog

## [0.5.0](https://github.com/aifivem/aicore-server/compare/v0.4.0...v0.5.0) (2026-11-06)


### New Features

* **recipe:** install sd-phone as the server's phone ([9506b35](https://github.com/aifivem/aicore-server/commit/9506b3505d9bad8fd8f276e78f09dc2b3efacd44))


### Bug Fixes

* **recipe:** write the sd-phone tasks from tools/recipe.ts, not by hand ([bc9fdc1](https://github.com/aifivem/aicore-server/commit/bc9fdc19fed63afb4a3ab957419811e2642c0c59))


### Documentation

* **compat:** sd-phone answers as lb-phone ([5b1cbed](https://github.com/aifivem/aicore-server/commit/5b1cbed7faad28ac7290c73335f55917aa37a6aa))

## [0.4.0](https://github.com/aifivem/aicore-server/compare/v0.3.1...v0.4.0) (2026-11-04)


### New Features

* **cfg:** add sv_enforceSteamAuth (off) to the env template ([dac991d](https://github.com/aifivem/aicore-server/commit/dac991d2c25da42eb969159dd591bac111156981))


### Miscellaneous Chores

* **cfg:** drop the deprecated steam_webApiKey convar ([ed001ea](https://github.com/aifivem/aicore-server/commit/ed001ea979be0b6c3650a9dd506aea2c93583040))

## [0.3.1](https://github.com/aifivem/aicore-server/compare/v0.3.0...v0.3.1) (2026-11-02)


### Bug Fixes

* **recipe:** give the script bundle unzip 15 minutes instead of txAdmin's 180 s ([3145001](https://github.com/aifivem/aicore-server/commit/31450015e75f1851394cfc35f2d9b4aba97e94b6))
* **recipe:** install each script from its own release zip again ([681cbeb](https://github.com/aifivem/aicore-server/commit/681cbeb2f07cdca356f3a9644a5c19cb83bf6b55))


### Documentation

* codem-phone gives only the phone used signal ([3ffa440](https://github.com/aifivem/aicore-server/commit/3ffa4404b1e5fd52c7524e7351e888ed62eafa90))
* codem-phone is back in the phone layer ([3341602](https://github.com/aifivem/aicore-server/commit/3341602a2a38f59572b390c32cb6106fd2564810))
* describe ai-core's needs layer ([b71b8e9](https://github.com/aifivem/aicore-server/commit/b71b8e954b6035eaf307051460ee144b9c19f980))
* document ai-core's warrants ([8773907](https://github.com/aifivem/aicore-server/commit/8773907171c34b822f7019beab2f20b7e9f2524b))
* document new lib helpers, the MDT warrant check and the qbx_smallresources bridge ([91891fb](https://github.com/aifivem/aicore-server/commit/91891fb9e7c29eb5dc1b0393cfe607a6a35500aa))
* document qbx_smallresources SendWantedAlert ([0697e55](https://github.com/aifivem/aicore-server/commit/0697e55aeabe101a4a3218a99bfd6c718e8e593d))
* document the phone used signal ([e83327a](https://github.com/aifivem/aicore-server/commit/e83327a271614f43b2a812b73040e24b0567833b))
* phone open signals; restore the 17mov_Phone and high-phone layer rows ([57f61fa](https://github.com/aifivem/aicore-server/commit/57f61fa4eb503362286e8cbaeff5ac14b2b84837))
* **rules:** state of one server lives in the git-ignored data/local.json ([d41eb6b](https://github.com/aifivem/aicore-server/commit/d41eb6b5ef5cd4b35e9b57fe18d5728671f5e4d6))
* shorten the phone used table ([e41017c](https://github.com/aifivem/aicore-server/commit/e41017c3391bcbfb7aef972335195d9888a5e597))
* what gksphone, 17mov_Phone, yseries and roadphone offer for phone opening ([f23464e](https://github.com/aifivem/aicore-server/commit/f23464ed39909f5d0446c9f69ddfd809f4827c95))


### Miscellaneous Chores

* **template:** keep data/local.json out of git ([fab3971](https://github.com/aifivem/aicore-server/commit/fab397153cfac951e14511aad88f90347cf2e9c7))

## [0.3.0](https://github.com/aifivem/aicore-server/compare/v0.2.0...v0.3.0) (2026-11-02)


### New Features

* **recipe:** install every script from one download and require FXServer 38039 ([45fd7e8](https://github.com/aifivem/aicore-server/commit/45fd7e886cb0ef2e49771702cf2b04a7218eaa34))


### Documentation

* **recipe:** scripts come from their release zips ([fa425f8](https://github.com/aifivem/aicore-server/commit/fa425f8524198236b342beda2009edaebf643276))
* **rules:** line-ending-only changes after a build are restored, never committed ([fe0dd78](https://github.com/aifivem/aicore-server/commit/fe0dd7814a3b16f0c19ae4d5053aabcbece87d5b))

## [0.2.0](https://github.com/aifivem/aicore-server/compare/v0.1.6...v0.2.0) (2026-11-02)


### New Features

* **recipe:** install every ai-* script from its latest release zip ([a07df3e](https://github.com/aifivem/aicore-server/commit/a07df3e03ec04f2107f124288df3545812ab7de3))
* **recipe:** install the AI agent files: skills, rules, tools and compatibility notes ([624ef59](https://github.com/aifivem/aicore-server/commit/624ef595c188f3148c32d614330e1ec5aff1aa57))
* **tools:** bun run setup clones packages and every ai-* resource for a development setup ([7f2032b](https://github.com/aifivem/aicore-server/commit/7f2032b85b67b282868e78cd5450ffbdc494de1f))


### Bug Fixes

* **template:** keep the web build in dist/ so release zips have the NUI ([36c66d8](https://github.com/aifivem/aicore-server/commit/36c66d8c0d36d3fdb90bc34da75808ad42cf1f7e))


### Code Refactoring

* use the [@aifivem](https://github.com/aifivem) packages in the template, rules, skills and docs ([6de8553](https://github.com/aifivem/aicore-server/commit/6de85534e61f085b731c68301dc763ef9a6d62db))


### Documentation

* dist/ is out of git, releases attach a zip with the build and the source ([438868c](https://github.com/aifivem/aicore-server/commit/438868c4a4bc21976774a65e050114611c571bb6))
* **rules:** never ln -s a folder in Git Bash ([09d90df](https://github.com/aifivem/aicore-server/commit/09d90df1da4d5c7e50de1739a05351f9cbe0d576))
* **rules:** release the packages before the resources ([446840e](https://github.com/aifivem/aicore-server/commit/446840e11ed8a29039669f6a7e18ffac7d526e11))
* **rules:** the packages are on npm; bin paths without ./ ([65ad009](https://github.com/aifivem/aicore-server/commit/65ad009e67df598816ced6c2998a16e65d8c11dc))
* **rules:** tsdown never cleans dist/, every repo runs the check workflow ([df7b1df](https://github.com/aifivem/aicore-server/commit/df7b1dfcd321f33fc69c89b86bec1796bdf4fca1))
* **skills:** script update downloads from aifivem repos, AGENTS.md lists the skill ([948367a](https://github.com/aifivem/aicore-server/commit/948367a4afbeddb319a7e64032834ff89853bc96))
* **template:** install from the release zip ([452a1f2](https://github.com/aifivem/aicore-server/commit/452a1f23d287eaad63ffff204720eb50c977db8c))


### Miscellaneous Chores

* **template:** build files are no longer in git, the release zip carries them ([a6b2880](https://github.com/aifivem/aicore-server/commit/a6b28805768d214dad7b5e2886d8e0a30fe9dde3))

## [0.1.6](https://github.com/aifivem/aicore-server/compare/v0.1.5...v0.1.6) (2026-11-02)


### Documentation

* **lib:** online job counts and onJobState, canCarryItems, unemployed and hasJobMember ([360c04e](https://github.com/aifivem/aicore-server/commit/360c04e007bcdf5d1d58ee1fff956d5b9259c757))
* **rules:** pull release-please's version commits right before every push ([f5db8b7](https://github.com/aifivem/aicore-server/commit/f5db8b7dbc36c033a0c3465ee828dc8c3c0ac5b1))
* **scale:** job count and job change numbers of the online mirror ([1b433f9](https://github.com/aifivem/aicore-server/commit/1b433f9b3e14a4efd711c3b46bdf7c50c9428746))

## [0.1.5](https://github.com/aifivem/aicore-server/compare/v0.1.4...v0.1.5) (2026-11-01)


### Documentation

* **inventory:** client item list and item count events ([5b514b5](https://github.com/aifivem/aicore-server/commit/5b514b55574e14a0dcc320c39d6c7ddb5fef5ace))
* lib money, jobs and character search; bridge bucket bookkeeping ([0299b03](https://github.com/aifivem/aicore-server/commit/0299b033f0c32bbdd5c0ac6ad0efd568759716db))
* **lib:** needs.add ([102be4f](https://github.com/aifivem/aicore-server/commit/102be4fb912399a41646eb52eec68dec798f24fe))
* **lib:** online and inventory helpers ([201495c](https://github.com/aifivem/aicore-server/commit/201495c5d1f28b9a1965e963fc7d4188136e9680))

## [0.1.4](https://github.com/aifivem/aicore-server/compare/v0.1.3...v0.1.4) (2026-11-01)


### Documentation

* **rules:** manifests after a release build ([e8da14b](https://github.com/aifivem/aicore-server/commit/e8da14bec1982a41fce031a6027f322412c1844c))

## [0.1.3](https://github.com/aifivem/aicore-server/compare/v0.1.2...v0.1.3) (2026-11-01)


### Bug Fixes

* **tools:** structure checker matches Windows paths for the shadcn exception ([47df1af](https://github.com/aifivem/aicore-server/commit/47df1afb6d9490d9e815d79a6a8677ddf4115b67))


### Documentation

* ban management in the lib and scale notes ([6e06215](https://github.com/aifivem/aicore-server/commit/6e06215cf63dc78d2a2964c42845491a91f36de3))
* **compat:** ESX player function overrides and forked framework exports ([f1fe2de](https://github.com/aifivem/aicore-server/commit/f1fe2dee89aa33d4e95f82caf045c67ca1656174))
* **compat:** full ESX, QBCore and Qbox bridge coverage and limits ([9829b69](https://github.com/aifivem/aicore-server/commit/9829b69910f471cc6059a9ccd85152f8ab773a42))
* **compat:** how inventories that own their item list feed the bridge ([57cfee8](https://github.com/aifivem/aicore-server/commit/57cfee840741fc175560b981a52d3fdd9ad43a2a))
* **compat:** multichar layer, item metadata, client key checks, full bridge coverage; lib and bridge rules ([65a65bd](https://github.com/aifivem/aicore-server/commit/65a65bd34743d195f6774b8569112b08dec7d63d))
* file and folder standard for TypeScript and Lua, paths after the restructure ([72b8008](https://github.com/aifivem/aicore-server/commit/72b8008752e944d309e17cc42b07ea2668263d86))
* **rules:** DeathInfo on the death event ([0ef0ab1](https://github.com/aifivem/aicore-server/commit/0ef0ab16642f37e914e9a249d0983f414fcaa216))
* **rules:** panel schema folder layout and the common entry exception ([5783fed](https://github.com/aifivem/aicore-server/commit/5783fedcaa50a24014d54ba4e7ece6a3f30a144e))
* **rules:** run the benches after moving or splitting files ([3a1e83a](https://github.com/aifivem/aicore-server/commit/3a1e83a5746a7ee060f9fc24664539f81b773c1f))


### Miscellaneous Chores

* **tools:** Lua file rules in the structure checker ([823e319](https://github.com/aifivem/aicore-server/commit/823e319039976a82c05960b42e961db4bcfe446e))
* **tools:** structure checker for the file and folder rules ([a4923e0](https://github.com/aifivem/aicore-server/commit/a4923e0276d6cc889e6e04b7e5cde76fc649f126))
* **tools:** structure checker skips copied Lua files ([87317ed](https://github.com/aifivem/aicore-server/commit/87317edc7c380353eac0e5d20c0f84024f7e2e55))

## [0.1.2](https://github.com/aifivem/aicore-server/compare/v0.1.1...v0.1.2) (2026-10-31)


### Documentation

* ai-* adapters carry no tested version ([9f3d357](https://github.com/aifivem/aicore-server/commit/9f3d357eb7c41189423bb4fbf2f84dae3afcb80e))
* git rules for commits, pushes and releases ([c4f0f47](https://github.com/aifivem/aicore-server/commit/c4f0f4728d62784c1ed2886b6ac195171fe9508f))
* needs refill, vRP test results, lib dependency note ([a9d5592](https://github.com/aifivem/aicore-server/commit/a9d55922dc680566d5a1b75eafc4b3c79d3b6dae))
* vRP compat note, Discord presence engine notes, credits ([818e9fe](https://github.com/aifivem/aicore-server/commit/818e9feb0e24db9d38786d55aae79372be1ec594))

## [0.1.1](https://github.com/aifivem/aicore-server/compare/v0.1.0...v0.1.1) (2026-10-31)


### Documentation

* banking and billing compat notes, docs-first rule for adapters ([0951d63](https://github.com/aifivem/aicore-server/commit/0951d63892d5af721b48c57523399126ef929627))
* client load order and export readiness ([2547490](https://github.com/aifivem/aicore-server/commit/2547490044666df0f74b974319663807605efb61))
* compat notes and rules for the new layers ([b90ca3b](https://github.com/aifivem/aicore-server/commit/b90ca3bc0ee8e8c47cc237d9ac9042ecced5b961))
* compat notes for the new adapters; restart.ts paces RCON ensures ([0eca660](https://github.com/aifivem/aicore-server/commit/0eca660f7277c2eb481b9658299c9dda8c52b318))
* headless capture of rAF-driven NUI needs real time ([04b8ca6](https://github.com/aifivem/aicore-server/commit/04b8ca67778669a9cb651b9dbbe9e720e1cdd74b))
* NUI layers and teleport ground rules ([b8ed39b](https://github.com/aifivem/aicore-server/commit/b8ed39b38aa49e50f64aae8030e591c5ede6f1de))
* release only on the owner's word; world prompt anchors ([1b3a7be](https://github.com/aifivem/aicore-server/commit/1b3a7be1aeaa68c4ee3c3a0ac2953d3d521bd23d))
* zone checking in ai-lib, compat rules for multi-return and provided names ([a7aea10](https://github.com/aifivem/aicore-server/commit/a7aea10400920ffbb604c2fdc204f3c9e39d39c7))
