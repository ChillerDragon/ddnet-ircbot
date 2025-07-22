export const answerToCommonQuestion = (message: String): String => {
	if(message.includes("clang") && message.includes("format") && message.includes("download")) {
		return "you can download clang-format-10 here https://github.com/muttleyxd/clang-tools-static-binaries/releases"
	}
	return ""
}
