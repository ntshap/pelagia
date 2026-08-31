/**
 * Media URL resolver.
 *
 * The 868 transition frames, 12 foregrounds, 8 posters and 8 idle clips are
 * served from the project's managed storage rather than committed to the
 * repository (137 MB of media cannot be checkpointed). Every public
 * `/sea/...` URL is rewritten to its `/manus-storage/{key}` counterpart;
 * the storage proxy in vite.config.ts resolves those keys to signed URLs.
 *
 * Frame keys follow the deterministic upload order: foregrounds first
 * (alphabetical), then the seven transition sequences in order, 124 frames
 * each. The six-digit frame numbering is preserved in the lookup logic.
 */

const STORAGE = '/manus-storage';

const foregroundKeys: Record<string, string> = {
  blue_rock: 'blue_rock_c2089f9b',
  dense_fish_school_final: 'dense_fish_school_final_5afcf34f',
  orange_tube_coral: 'orange_tube_coral_7cfc2541',
  pink_branching_coral: 'pink_branching_coral_d3fe714f',
  regenerated_biolab_vessel: 'regenerated_biolab_vessel_2ce19fbe',
  regenerated_diver: 'regenerated_diver_bfc51172',
  regenerated_jellyfish: 'regenerated_jellyfish_e154d8ab',
  regenerated_submersible: 'regenerated_submersible_23828698',
  ring_fish_school_final: 'ring_fish_school_final_bf22e1bf',
  scattered_fish_school_final: 'scattered_fish_school_final_9d757d2b',
  seagrass: 'seagrass_6e44f41a',
  turquoise_dome_device: 'turquoise_dome_device_b39dc875',
};

const posterKeys: Record<string, string> = {
  'scene-01-surface': 'scene-01-surface_41ffca2e',
  'scene-02-midwater': 'scene-02-midwater_ea91d87a',
  'scene-03-canyon': 'scene-03-canyon_566e9c3f',
  'scene-04-bioluminescent': 'scene-04-bioluminescent_041eb082',
  'scene-05-nursery': 'scene-05-nursery_380037fd',
  'scene-06-laboratory': 'scene-06-laboratory_9b118d92',
  'scene-07-hydrothermal': 'scene-07-hydrothermal_e3757c47',
  'scene-08-observatory': 'scene-08-observatory_4dbaf78c',
};

const idleVideoKeys: Record<string, string> = {
  'scene-01-surface': 'scene-01-surface_30174174',
  'scene-02-midwater': 'scene-02-midwater_38b05b2a',
  'scene-03-canyon': 'scene-03-canyon_1ec31888',
  'scene-04-bioluminescent': 'scene-04-bioluminescent_0da40b2d',
  'scene-05-nursery': 'scene-05-nursery_d70f1d46',
  'scene-06-laboratory': 'scene-06-laboratory_e69776db',
  'scene-07-hydrothermal': 'scene-07-hydrothermal_5060e840',
  'scene-08-observatory': 'scene-08-observatory_0fd7b704',
};

/** Keys for all 868 frames, grouped per transition in sequence order. */
const transitionFrameKeys: Record<string, string[]> = {
  'transition-01-02': [
    'frame_000001_ce3011a6', 'frame_000002_c4dbcf16', 'frame_000003_59b11dff', 'frame_000004_8f55d472',
    'frame_000005_ae447033', 'frame_000006_bca2815e', 'frame_000007_c305664d', 'frame_000008_daa1e346',
    'frame_000009_32c297f9', 'frame_000010_12ae3701', 'frame_000011_b184206c', 'frame_000012_b20ac2ee',
    'frame_000013_0a712232', 'frame_000014_4181cbf0', 'frame_000015_a6c1f02c', 'frame_000016_464fe476',
    'frame_000017_61e5763d', 'frame_000018_edb38916', 'frame_000019_cd68f399', 'frame_000020_34d1d230',
    'frame_000021_1eed6046', 'frame_000022_abeb4e26', 'frame_000023_f75cabe0', 'frame_000024_80510432',
    'frame_000025_9249c6aa', 'frame_000026_585471a7', 'frame_000027_ded53eca', 'frame_000028_dbb91771',
    'frame_000029_a71ee814', 'frame_000030_e5bbf589', 'frame_000031_3a8a91fe', 'frame_000032_39c4f1c9',
    'frame_000033_58034f9b', 'frame_000034_6f96a703', 'frame_000035_c871a654', 'frame_000036_2f2c8d03',
    'frame_000037_0106f4e3', 'frame_000038_cc21d33d', 'frame_000039_45a5c29b', 'frame_000040_834ccb90',
    'frame_000041_4b6fda47', 'frame_000042_a898cdd0', 'frame_000043_5fe3f7e2', 'frame_000044_0be749e1',
    'frame_000045_494e5285', 'frame_000046_e0f96551', 'frame_000047_9400f6cc', 'frame_000048_f0a3d18c',
    'frame_000049_8425de60', 'frame_000050_5c7d896e', 'frame_000051_06f05cb3', 'frame_000052_d9f85468',
    'frame_000053_eb7a329d', 'frame_000054_ba312f01', 'frame_000055_9ebeded7', 'frame_000056_577dbadc',
    'frame_000057_8f5a842e', 'frame_000058_b5ecffe1', 'frame_000059_00cf26d3', 'frame_000060_1f480029',
    'frame_000061_e1dd3f8e', 'frame_000062_382ea971', 'frame_000063_0fb417c1', 'frame_000064_04e255e6',
    'frame_000065_3f2a5149', 'frame_000066_91492d09', 'frame_000067_9ccb4f05', 'frame_000068_a860e3ed',
    'frame_000069_cbfb44de', 'frame_000070_d5cafa42', 'frame_000071_361242c3', 'frame_000072_ea628a5e',
    'frame_000073_23816a82', 'frame_000074_c407f855', 'frame_000075_ef3aa150', 'frame_000076_4ef2d0ff',
    'frame_000077_3b2ef97c', 'frame_000078_0df1f2d4', 'frame_000079_a85db1b7', 'frame_000080_5bf5b3ec',
    'frame_000081_c997283b', 'frame_000082_9ff47d05', 'frame_000083_69da82a5', 'frame_000084_0320fcd1',
    'frame_000085_79740db3', 'frame_000086_6ea1c18f', 'frame_000087_2f6302bb', 'frame_000088_6001eb22',
    'frame_000089_20d0d8c8', 'frame_000090_26378344', 'frame_000091_30bb1076', 'frame_000092_0d1d70b0',
    'frame_000093_5046e172', 'frame_000094_41ec80e1', 'frame_000095_e1ae826d', 'frame_000096_07c26804',
    'frame_000097_349c05a4', 'frame_000098_75401d19', 'frame_000099_32310af1', 'frame_000100_12cded3f',
    'frame_000101_da91ac75', 'frame_000102_1b67cb63', 'frame_000103_71f6f0cd', 'frame_000104_546eecef',
    'frame_000105_05c64aae', 'frame_000106_9e2df5d8', 'frame_000107_fccdbe0d', 'frame_000108_e065463b',
    'frame_000109_0bee33f7', 'frame_000110_5a0de73f', 'frame_000111_66f722e9', 'frame_000112_e5c8e714',
    'frame_000113_0eec6264', 'frame_000114_a77128a5', 'frame_000115_bf11e667', 'frame_000116_256c7014',
    'frame_000117_57cd4c93', 'frame_000118_20cd6984', 'frame_000119_909936c7', 'frame_000120_f0c50613',
    'frame_000121_8e5e02b9', 'frame_000122_b506c7b7', 'frame_000123_b3d60096', 'frame_000124_6f1894bb',
  ],
  'transition-02-03': [
    'frame_000001_5e2b9eb3', 'frame_000002_8c7a2803', 'frame_000003_d749fafa', 'frame_000004_7608897b',
    'frame_000005_14ced7c3', 'frame_000006_13f78565', 'frame_000007_03d701ba', 'frame_000008_aa4cf2b1',
    'frame_000009_b8aee110', 'frame_000010_7352865e', 'frame_000011_d3a172e8', 'frame_000012_ee9544eb',
    'frame_000013_dd3d025e', 'frame_000014_f2b6f0e5', 'frame_000015_d8609c01', 'frame_000016_cdf28689',
    'frame_000017_8cd3d2e0', 'frame_000018_4858cf83', 'frame_000019_388d7bfe', 'frame_000020_d836b7aa',
    'frame_000021_9bc128be', 'frame_000022_ce55c29e', 'frame_000023_caa291a9', 'frame_000024_52530021',
    'frame_000025_954fa508', 'frame_000026_6fa99f52', 'frame_000027_90b6c63d', 'frame_000028_7e4e8cc8',
    'frame_000029_62638419', 'frame_000030_630864ba', 'frame_000031_c165fba3', 'frame_000032_aa544a62',
    'frame_000033_574fdc8f', 'frame_000034_ba8e15af', 'frame_000035_1b63c5dd', 'frame_000036_90fd3dc0',
    'frame_000037_977b6ecd', 'frame_000038_b2783a26', 'frame_000039_65272a3b', 'frame_000040_e4599a48',
    'frame_000041_0523e5c5', 'frame_000042_df0d709c', 'frame_000043_63786421', 'frame_000044_cb19caa5',
    'frame_000045_0b2957ea', 'frame_000046_6a323bcf', 'frame_000047_23ba797f', 'frame_000048_3ccbe29e',
    'frame_000049_f9d430da', 'frame_000050_2c5f16ba', 'frame_000051_f20619ab', 'frame_000052_b55e493a',
    'frame_000053_7b609267', 'frame_000054_25b55bdb', 'frame_000055_b5d0caca', 'frame_000056_56d7e172',
    'frame_000057_11d21b78', 'frame_000058_a1719fef', 'frame_000059_9f427ac0', 'frame_000060_0be9c77b',
    'frame_000061_d6640bb6', 'frame_000062_ffea8223', 'frame_000063_c39dd2cf', 'frame_000064_efd863af',
    'frame_000065_24867caf', 'frame_000066_3ae510b7', 'frame_000067_6fb4ea14', 'frame_000068_7e6013b4',
    'frame_000069_221c4a50', 'frame_000070_97044613', 'frame_000071_a955b904', 'frame_000072_7810c898',
    'frame_000073_e9142517', 'frame_000074_b319eac3', 'frame_000075_315bf73d', 'frame_000076_2f56e3d1',
    'frame_000077_6cc4e6ac', 'frame_000078_3d4fbd9f', 'frame_000079_4d4b090c', 'frame_000080_964eff8d',
    'frame_000081_be69dfe1', 'frame_000082_387b5487', 'frame_000083_646a0af5', 'frame_000084_6f127a68',
    'frame_000085_534ceb94', 'frame_000086_99b4f314', 'frame_000087_f17d4fac', 'frame_000088_5a160cae',
    'frame_000089_65b2856a', 'frame_000090_a8cc5c3b', 'frame_000091_c76c45b8', 'frame_000092_d472e375',
    'frame_000093_18c68bdd', 'frame_000094_7309d1be', 'frame_000095_c3b29762', 'frame_000096_de391e02',
    'frame_000097_7402cecd', 'frame_000098_6057dae0', 'frame_000099_6b906dc4', 'frame_000100_7c5b7733',
    'frame_000101_5a5f4cb8', 'frame_000102_17afac03', 'frame_000103_b254b546', 'frame_000104_f8077e74',
    'frame_000105_ba190bc6', 'frame_000106_aa177f2c', 'frame_000107_7860d0ec', 'frame_000108_063d1e7e',
    'frame_000109_f884937c', 'frame_000110_0e430fcc', 'frame_000111_91b8aaf1', 'frame_000112_50fab311',
    'frame_000113_ce7d38e2', 'frame_000114_7859bdae', 'frame_000115_2f269591', 'frame_000116_852ad2c0',
    'frame_000117_985ec61d', 'frame_000118_e5571dc2', 'frame_000119_8d2c8075', 'frame_000120_1b2934fc',
    'frame_000121_5179437d', 'frame_000122_474f5c8a', 'frame_000123_bc906200', 'frame_000124_d7dc4500',
  ],
  'transition-03-04': [
    'frame_000001_39e23af6', 'frame_000002_5575d6ba', 'frame_000003_e0e30c80', 'frame_000004_9e9ca47e',
    'frame_000005_2fd25d87', 'frame_000006_9760c518', 'frame_000007_5632a9ad', 'frame_000008_7f2ca490',
    'frame_000009_bddc8549', 'frame_000010_5d8e8516', 'frame_000011_632a1387', 'frame_000012_1ecbd328',
    'frame_000013_cf644bde', 'frame_000014_2e56cfb7', 'frame_000015_43f791de', 'frame_000016_1a987ff4',
    'frame_000017_e68e74ec', 'frame_000018_91492b40', 'frame_000019_4c652030', 'frame_000020_c3513a5b',
    'frame_000021_f35f48fa', 'frame_000022_f808aaf3', 'frame_000023_5158b1ca', 'frame_000024_a837a532',
    'frame_000025_386de826', 'frame_000026_09b9ffc6', 'frame_000027_c7473b4b', 'frame_000028_d37a7554',
    'frame_000029_f4f550b4', 'frame_000030_f512866e', 'frame_000031_ca581db6', 'frame_000032_ba5264e8',
    'frame_000033_e8b464ae', 'frame_000034_3ab75f68', 'frame_000035_73bdf2bd', 'frame_000036_ae55f6ec',
    'frame_000037_8b4f4a86', 'frame_000038_8ce426b6', 'frame_000039_3149d09b', 'frame_000040_c8e76e46',
    'frame_000041_94ffabe6', 'frame_000042_a453fedf', 'frame_000043_9f0ca035', 'frame_000044_135a807f',
    'frame_000045_03421fb2', 'frame_000046_992d7543', 'frame_000047_4fde55b9', 'frame_000048_8decd506',
    'frame_000049_cd097977', 'frame_000050_0cecd6eb', 'frame_000051_e45b91b9', 'frame_000052_8074e362',
    'frame_000053_2a93442d', 'frame_000054_bbd8d692', 'frame_000055_c38ebcf3', 'frame_000056_52caf863',
    'frame_000057_f7690cbe', 'frame_000058_63172b55', 'frame_000059_b488afa2', 'frame_000060_bcc8bfe2',
    'frame_000061_e0b19542', 'frame_000062_a11d5b60', 'frame_000063_4fb503a8', 'frame_000064_53137cbb',
    'frame_000065_b2bdf439', 'frame_000066_e07fb190', 'frame_000067_d6a4db2c', 'frame_000068_64f07d79',
    'frame_000069_977da3d0', 'frame_000070_0705a6d9', 'frame_000071_a98af300', 'frame_000072_903c7d5f',
    'frame_000073_e3ed203c', 'frame_000074_314074d5', 'frame_000075_bab5d9ea', 'frame_000076_d3baf0b0',
    'frame_000077_a32e89d7', 'frame_000078_06c807b0', 'frame_000079_88d23f44', 'frame_000080_1e27494f',
    'frame_000081_ac42d4c3', 'frame_000082_d6a7ba02', 'frame_000083_e71154b3', 'frame_000084_c5fac220',
    'frame_000085_cf10ba5b', 'frame_000086_fa515675', 'frame_000087_c616e0f6', 'frame_000088_4ed7d630',
    'frame_000089_e3bff201', 'frame_000090_3f9c3ccd', 'frame_000091_c5587a88', 'frame_000092_e986a812',
    'frame_000093_51cdae7e', 'frame_000094_c64ddd6f', 'frame_000095_16975e50', 'frame_000096_c16b7558',
    'frame_000097_740de586', 'frame_000098_35d94827', 'frame_000099_3fce365d', 'frame_000100_a21fa9d9',
    'frame_000101_0b2ffc8f', 'frame_000102_84ef2c24', 'frame_000103_0bccf5c5', 'frame_000104_02bacc61',
    'frame_000105_094f71db', 'frame_000106_688be618', 'frame_000107_b5efb4b3', 'frame_000108_2197740d',
    'frame_000109_a07bd87b', 'frame_000110_3905627e', 'frame_000111_28782325', 'frame_000112_47731122',
    'frame_000113_b8961372', 'frame_000114_10c18acd', 'frame_000115_353cc40e', 'frame_000116_9a4a48a8',
    'frame_000117_0418e68c', 'frame_000118_a0b103df', 'frame_000119_fda4dfbe', 'frame_000120_112373ab',
    'frame_000121_8fffaf37', 'frame_000122_628d75ff', 'frame_000123_857fe8f2', 'frame_000124_337d64ac',
  ],
  'transition-04-05': [
    'frame_000001_8069b6e2', 'frame_000002_b69c25e1', 'frame_000003_44f10195', 'frame_000004_91f76636',
    'frame_000005_8d330ecc', 'frame_000006_e50feabe', 'frame_000007_5e20725a', 'frame_000008_21ceff6a',
    'frame_000009_70ac1490', 'frame_000010_db7fe2d9', 'frame_000011_72b95617', 'frame_000012_947b20dd',
    'frame_000013_440a4434', 'frame_000014_c312e85d', 'frame_000015_72823e78', 'frame_000016_f8944100',
    'frame_000017_c1533f2e', 'frame_000018_87f45fb3', 'frame_000019_977ac81a', 'frame_000020_30851781',
    'frame_000021_f2484909', 'frame_000022_afe24bf8', 'frame_000023_61b2a45b', 'frame_000024_ada173c5',
    'frame_000025_6406aae9', 'frame_000026_6c63fe12', 'frame_000027_67590e4c', 'frame_000028_b97ba668',
    'frame_000029_8f5622cd', 'frame_000030_d950d080', 'frame_000031_65b6e2b1', 'frame_000032_bd2e99c2',
    'frame_000033_6ce36de9', 'frame_000034_3ada627d', 'frame_000035_80029646', 'frame_000036_7b4ec11c',
    'frame_000037_c202c65a', 'frame_000038_a75ea2f1', 'frame_000039_89615660', 'frame_000040_4969578c',
    'frame_000041_945d4d5b', 'frame_000042_f1a2e5aa', 'frame_000043_9c1515bc', 'frame_000044_c4c91dde',
    'frame_000045_9af21281', 'frame_000046_2bb2a035', 'frame_000047_e0829e08', 'frame_000048_2ad1d98f',
    'frame_000049_7baa219c', 'frame_000050_b263f8ae', 'frame_000051_929c47f8', 'frame_000052_b87d59ef',
    'frame_000053_57505f6b', 'frame_000054_babaf81d', 'frame_000055_e0631279', 'frame_000056_2c3ebb6b',
    'frame_000057_49fbb764', 'frame_000058_627b77a0', 'frame_000059_c3d60ac3', 'frame_000060_8ff3f876',
    'frame_000061_2b11fb30', 'frame_000062_71db408d', 'frame_000063_05b47bec', 'frame_000064_ddf58c1c',
    'frame_000065_60c71df8', 'frame_000066_bb0855dd', 'frame_000067_635b5ed1', 'frame_000068_7f250d4f',
    'frame_000069_b017fe74', 'frame_000070_71271eb8', 'frame_000071_705ee92e', 'frame_000072_ec15e035',
    'frame_000073_8986cba0', 'frame_000074_e567cd86', 'frame_000075_e2441083', 'frame_000076_0ac71a66',
    'frame_000077_adeac297', 'frame_000078_3c695b55', 'frame_000079_4e21ae84', 'frame_000080_03b661c2',
    'frame_000081_f3788006', 'frame_000082_f9acedc7', 'frame_000083_90ff6536', 'frame_000084_7d4889b9',
    'frame_000085_4b7dfd77', 'frame_000086_6a591e91', 'frame_000087_863b7edb', 'frame_000088_726291e9',
    'frame_000089_019a26c6', 'frame_000090_e72f8baf', 'frame_000091_d23f2244', 'frame_000092_d9d93b6b',
    'frame_000093_958ebb38', 'frame_000094_9dc576e3', 'frame_000095_0930d7f7', 'frame_000096_8f0b757a',
    'frame_000097_5163ce05', 'frame_000098_f0ea8a47', 'frame_000099_5f13b627', 'frame_000100_f654e678',
    'frame_000101_10af3cb3', 'frame_000102_ac0d70c2', 'frame_000103_f1c31587', 'frame_000104_55abbacf',
    'frame_000105_92c18886', 'frame_000106_b5d7da19', 'frame_000107_936c2724', 'frame_000108_1e514a49',
    'frame_000109_1c6816a5', 'frame_000110_fd264f97', 'frame_000111_84dcd1c2', 'frame_000112_2fe07bcd',
    'frame_000113_c89f8295', 'frame_000114_f41da0a9', 'frame_000115_c19c65f9', 'frame_000116_30bad79f',
    'frame_000117_0bc3668b', 'frame_000118_016c9eec', 'frame_000119_1576c243', 'frame_000120_7cf48a18',
    'frame_000121_4a7f5257', 'frame_000122_340c2950', 'frame_000123_77ce65c5', 'frame_000124_005e4ccc',
  ],
  'transition-05-06': [
    'frame_000001_58629fdc', 'frame_000002_234c795b', 'frame_000003_7a22d0f7', 'frame_000004_8a9965c9',
    'frame_000005_be10547d', 'frame_000006_e130b835', 'frame_000007_3686197a', 'frame_000008_78960ffb',
    'frame_000009_bac923e7', 'frame_000010_7f6ec177', 'frame_000011_cbdfc304', 'frame_000012_3cdd85d2',
    'frame_000013_5473079d', 'frame_000014_50ca6814', 'frame_000015_907ebc7c', 'frame_000016_49821601',
    'frame_000017_5d656cf3', 'frame_000018_3335b560', 'frame_000019_b54b50ea', 'frame_000020_5148d44e',
    'frame_000021_78621919', 'frame_000022_ec314622', 'frame_000023_601013c3', 'frame_000024_6c8b10d2',
    'frame_000025_7413685a', 'frame_000026_738030f2', 'frame_000027_f601a128', 'frame_000028_3ece0bbc',
    'frame_000029_7e8c623b', 'frame_000030_fe164c0d', 'frame_000031_c5b57dd9', 'frame_000032_44fb2ee9',
    'frame_000033_a38f8450', 'frame_000034_5ac01696', 'frame_000035_3d639305', 'frame_000036_81c4a62d',
    'frame_000037_f5cd47ac', 'frame_000038_4df6b7f9', 'frame_000039_85b07738', 'frame_000040_0291c321',
    'frame_000041_5afdd902', 'frame_000042_7e8c4fc9', 'frame_000043_f628ebbe', 'frame_000044_24dffacc',
    'frame_000045_f7f3261d', 'frame_000046_bc413e48', 'frame_000047_badd034d', 'frame_000048_4618cd22',
    'frame_000049_4f1a798e', 'frame_000050_bc7defd2', 'frame_000051_09dcb9c3', 'frame_000052_e1a7e7e7',
    'frame_000053_61134371', 'frame_000054_70110f86', 'frame_000055_0617a4e4', 'frame_000056_989913c9',
    'frame_000057_043f6bbd', 'frame_000058_7c54890e', 'frame_000059_65d3075c', 'frame_000060_e579307d',
    'frame_000061_741bc598', 'frame_000062_42e97ab2', 'frame_000063_ac7e9e3b', 'frame_000064_81f5e39a',
    'frame_000065_3a89b79b', 'frame_000066_2c0b656c', 'frame_000067_d5f1c32d', 'frame_000068_d22c1308',
    'frame_000069_e3a888cb', 'frame_000070_5c6d6278', 'frame_000071_bdcd73fc', 'frame_000072_00a30d08',
    'frame_000073_ef425e36', 'frame_000074_1ddd3b5e', 'frame_000075_a22cc017', 'frame_000076_f2f85761',
    'frame_000077_cd18023f', 'frame_000078_57be2bc0', 'frame_000079_9f7d90d9', 'frame_000080_db503950',
    'frame_000081_f06f9c93', 'frame_000082_98c85453', 'frame_000083_99794e87', 'frame_000084_e0fee261',
    'frame_000085_5863c6fb', 'frame_000086_1b8588fa', 'frame_000087_f62635e5', 'frame_000088_49974f91',
    'frame_000089_75c4b1fc', 'frame_000090_563d87c5', 'frame_000091_362d7047', 'frame_000092_6a984f75',
    'frame_000093_5834e751', 'frame_000094_b87cce3d', 'frame_000095_44c99d08', 'frame_000096_30545341',
    'frame_000097_bc87ea9a', 'frame_000098_463c73c7', 'frame_000099_9778e27b', 'frame_000100_e4cfa80e',
    'frame_000101_285f8d1d', 'frame_000102_8d317fba', 'frame_000103_7e9867f9', 'frame_000104_0aee7dc1',
    'frame_000105_32d7b141', 'frame_000106_5ae6191a', 'frame_000107_8b5a10ce', 'frame_000108_fd16de63',
    'frame_000109_5345bca3', 'frame_000110_f5d7dce1', 'frame_000111_e2b01373', 'frame_000112_0afc2359',
    'frame_000113_f71ce4b0', 'frame_000114_797050eb', 'frame_000115_92ad75e7', 'frame_000116_f3328fa8',
    'frame_000117_6129d63d', 'frame_000118_8bccf064', 'frame_000119_54cd4069', 'frame_000120_541f773d',
    'frame_000121_caaad86d', 'frame_000122_22d3b2fa', 'frame_000123_60b376d4', 'frame_000124_b906262d',
  ],
  'transition-06-07': [
    'frame_000001_d9224fd6', 'frame_000002_5fa71440', 'frame_000003_8d734fc3', 'frame_000004_36349602',
    'frame_000005_7b74518b', 'frame_000006_1cf70fbc', 'frame_000007_c0fc10d5', 'frame_000008_3533e67f',
    'frame_000009_a6d5932a', 'frame_000010_c45a4e15', 'frame_000011_4ea12fd8', 'frame_000012_614c9ce7',
    'frame_000013_7a48a2a2', 'frame_000014_6ad561aa', 'frame_000015_bc9c97dc', 'frame_000016_51b40070',
    'frame_000017_21fc8cb1', 'frame_000018_0810a02e', 'frame_000019_48f3c961', 'frame_000020_900f0290',
    'frame_000021_70795c93', 'frame_000022_73d91a53', 'frame_000023_27715991', 'frame_000024_21e158b7',
    'frame_000025_10059704', 'frame_000026_082cd41d', 'frame_000027_9397ce56', 'frame_000028_4eb0999f',
    'frame_000029_d3660420', 'frame_000030_0c0ebf35', 'frame_000031_4d033d52', 'frame_000032_b909868a',
    'frame_000033_ef14a774', 'frame_000034_73606ee9', 'frame_000035_1f5a8bd5', 'frame_000036_6f547411',
    'frame_000037_9442faa9', 'frame_000038_4055171f', 'frame_000039_ecd8f4bc', 'frame_000040_0eb7d24c',
    'frame_000041_06642713', 'frame_000042_ed8826f3', 'frame_000043_4011aafe', 'frame_000044_e388a7d6',
    'frame_000045_25de6362', 'frame_000046_03e52a90', 'frame_000047_f067ab94', 'frame_000048_cee8356a',
    'frame_000049_fa8a5340', 'frame_000050_cb64b678', 'frame_000051_b911c4a0', 'frame_000052_d4f8e0b3',
    'frame_000053_e3867165', 'frame_000054_0b4476a1', 'frame_000055_204438c7', 'frame_000056_0bd933dc',
    'frame_000057_78ce8cbb', 'frame_000058_25b1fe03', 'frame_000059_75c07dca', 'frame_000060_d51415f3',
    'frame_000061_f0b7514e', 'frame_000062_f5a2c6d3', 'frame_000063_bb85ace7', 'frame_000064_fe4cb51c',
    'frame_000065_820c62c8', 'frame_000066_c58e990d', 'frame_000067_edfdf864', 'frame_000068_148eff46',
    'frame_000069_1833a511', 'frame_000070_c9e0fb31', 'frame_000071_9392d6fc', 'frame_000072_66a48794',
    'frame_000073_9ede6234', 'frame_000074_3341186c', 'frame_000075_ce725ab9', 'frame_000076_6c420af7',
    'frame_000077_76b580a5', 'frame_000078_1fe6b0bb', 'frame_000079_f1a552f7', 'frame_000080_5c4a92bb',
    'frame_000081_59ee1a86', 'frame_000082_5d285348', 'frame_000083_6426c8f6', 'frame_000084_76b96adb',
    'frame_000085_56e88152', 'frame_000086_b278b9ad', 'frame_000087_bb6bc53a', 'frame_000088_c897934c',
    'frame_000089_9a819356', 'frame_000090_ae2e97b4', 'frame_000091_76c8c480', 'frame_000092_cd06b840',
    'frame_000093_7e54b2c3', 'frame_000094_264dabe2', 'frame_000095_5e7c4bfc', 'frame_000096_37982f52',
    'frame_000097_ae2791ea', 'frame_000098_c319aa9e', 'frame_000099_9dfc3802', 'frame_000100_86344774',
    'frame_000101_e48be9f9', 'frame_000102_28c95158', 'frame_000103_6d6e02f9', 'frame_000104_5148e5de',
    'frame_000105_87d66932', 'frame_000106_fd121c54', 'frame_000107_2e8a2c02', 'frame_000108_2435c02d',
    'frame_000109_bbe5eb27', 'frame_000110_4dd01061', 'frame_000111_6b767410', 'frame_000112_53d9438d',
    'frame_000113_72094624', 'frame_000114_e8f75e45', 'frame_000115_ea90b07f', 'frame_000116_140640e0',
    'frame_000117_1109da29', 'frame_000118_80cb06ef', 'frame_000119_2e4a34b6', 'frame_000120_46835e2a',
    'frame_000121_a55ae02f', 'frame_000122_86dd5140', 'frame_000123_b4176c47', 'frame_000124_8a457c66',
  ],
  'transition-07-08': [
    'frame_000001_df8b5336', 'frame_000002_0c84a7da', 'frame_000003_b7ab5fa6', 'frame_000004_6acd30d4',
    'frame_000005_83cb7b3e', 'frame_000006_9d99b920', 'frame_000007_74f22886', 'frame_000008_b729df47',
    'frame_000009_b955079a', 'frame_000010_c375e5a6', 'frame_000011_384275b9', 'frame_000012_77e7d5de',
    'frame_000013_26d41227', 'frame_000014_0a7e0478', 'frame_000015_31199787', 'frame_000016_b2e6ded5',
    'frame_000017_77975d16', 'frame_000018_7845fe40', 'frame_000019_3c487f95', 'frame_000020_f611e1ff',
    'frame_000021_7291040b', 'frame_000022_42f6ec91', 'frame_000023_e5e36c51', 'frame_000024_ba5d87a1',
    'frame_000025_2dcb555c', 'frame_000026_90408b85', 'frame_000027_a51e9bf4', 'frame_000028_91a9f4da',
    'frame_000029_0ccc1940', 'frame_000030_d4938dc2', 'frame_000031_6c9cd259', 'frame_000032_d6d1b07e',
    'frame_000033_649963f0', 'frame_000034_dfd5f8d7', 'frame_000035_bb6149a2', 'frame_000036_fcbb8d91',
    'frame_000037_0e107052', 'frame_000038_095286d4', 'frame_000039_615d39fd', 'frame_000040_4221511c',
    'frame_000041_43e4417d', 'frame_000042_f8acdfeb', 'frame_000043_593b6efe', 'frame_000044_a6567e4c',
    'frame_000045_a71e9f55', 'frame_000046_2cb41a6d', 'frame_000047_65382256', 'frame_000048_0b836e97',
    'frame_000049_b71bc179', 'frame_000050_c6608240', 'frame_000051_6c6d9bee', 'frame_000052_f61a97ba',
    'frame_000053_8fdaf8ef', 'frame_000054_e7ff8fe6', 'frame_000055_13589992', 'frame_000056_d66fa996',
    'frame_000057_3b7a7b6c', 'frame_000058_22169c79', 'frame_000059_b6893889', 'frame_000060_ba62a747',
    'frame_000061_66e63daf', 'frame_000062_903180ae', 'frame_000063_44d7ce80', 'frame_000064_856c7e38',
    'frame_000065_d5dfed25', 'frame_000066_9b43069b', 'frame_000067_d47d0111', 'frame_000068_4aa94bbc',
    'frame_000069_503ab9db', 'frame_000070_458507ec', 'frame_000071_dc4da3e3', 'frame_000072_371e38e1',
    'frame_000073_c4c1b8cb', 'frame_000074_2dbfe082', 'frame_000075_4a9273ad', 'frame_000076_aa681353',
    'frame_000077_e04af00e', 'frame_000078_22b9965f', 'frame_000079_9574f888', 'frame_000080_a5d76611',
    'frame_000081_7c309b03', 'frame_000082_f2cd706e', 'frame_000083_84b9a4a0', 'frame_000084_935dea59',
    'frame_000085_0b726ad7', 'frame_000086_ed88cfb3', 'frame_000087_b2f3dbe1', 'frame_000088_8a5bb12a',
    'frame_000089_54d3bedc', 'frame_000090_f474b91a', 'frame_000091_9b1a614b', 'frame_000092_c2a1005d',
    'frame_000093_99de8c0c', 'frame_000094_015b3387', 'frame_000095_f6952705', 'frame_000096_6c10e552',
    'frame_000097_7e4fffc2', 'frame_000098_8651172d', 'frame_000099_8873665b', 'frame_000100_4a2e2668',
    'frame_000101_0b562976', 'frame_000102_0b6a0c48', 'frame_000103_75aed66e', 'frame_000104_d0d0b7f1',
    'frame_000105_90935a57', 'frame_000106_db310ee3', 'frame_000107_807aa97e', 'frame_000108_7e4fe033',
    'frame_000109_ffd301f7', 'frame_000110_62ad288b', 'frame_000111_ea20d04d', 'frame_000112_40c245ad',
    'frame_000113_7efa3e32', 'frame_000114_1da3a51e', 'frame_000115_242b382f', 'frame_000116_9281a14a',
    'frame_000117_d3eebe47', 'frame_000118_fa9e572a', 'frame_000119_d891d3c3', 'frame_000120_7c879110',
    'frame_000121_dfd2788b', 'frame_000122_25d2803c', 'frame_000123_d026912d', 'frame_000124_7802402d',
  ],
};

const FRAME_PATH = /^\/sea\/transitions\/(transition-\d\d-\d\d)\/frame_(\d{6})\.webp$/;

/**
 * Resolves a public `/sea/...` media path to its storage URL. Unknown paths
 * (e.g. the optional ambient audio) pass through unchanged.
 */
export function mediaUrl(path: string): string {
  const frame = FRAME_PATH.exec(path);
  if (frame) {
    const keys = transitionFrameKeys[frame[1]];
    const key = keys?.[Number.parseInt(frame[2], 10) - 1];
    if (key) return `${STORAGE}/${key}.webp`;
    return path;
  }
  if (path.startsWith('/sea/foregrounds/')) {
    const name = path.slice('/sea/foregrounds/'.length, -'.webp'.length);
    const key = foregroundKeys[name];
    return key ? `${STORAGE}/${key}.webp` : path;
  }
  if (path.startsWith('/sea/posters/')) {
    const name = path.slice('/sea/posters/'.length, -'.webp'.length);
    const key = posterKeys[name];
    return key ? `${STORAGE}/${key}.webp` : path;
  }
  if (path.startsWith('/sea/idle/')) {
    const name = path.slice('/sea/idle/'.length, -'.mp4'.length);
    const key = idleVideoKeys[name];
    return key ? `${STORAGE}/${key}.mp4` : path;
  }
  return path;
}
