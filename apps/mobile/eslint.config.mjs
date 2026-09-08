import base from "@tando/config/eslint";

export default [...base, { ignores: [".expo/**", "android/**", "ios/**"] }];
