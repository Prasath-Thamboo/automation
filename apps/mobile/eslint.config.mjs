import base from "@velekya/config/eslint";

export default [...base, { ignores: [".expo/**", "android/**", "ios/**"] }];
