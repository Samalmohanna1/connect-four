const colors = {
    yellow500: "#E1A717",
    yellow600: "#B08312",
    red500: "#E22100",
    red600: "#801300",
    blue500: "#77A9C3",
    blue600: "#4F6A93",
    white500: "#F5F3EF",
    white600: "#C6B5A1",
    black500: "#1B1819",
    black600: "#0A0708",
};

export default {
    centerX: 0,
    centerY: 0,

    resetGame() {},

    colors,

    bodyTextStyle: {
        fontFamily: "OpenSans",
        fontStyle: "600",
        fontSize: 34,
        color: colors.black500,
    },
    overlayTextStyle: {
        fontFamily: "OpenSans",
        fontStyle: "800",
        fontSize: 64,
        color: colors.white500,
    },
    turnTextStyle: {
        fontFamily: "OpenSans",
        fontStyle: "800",
        fontSize: 34,
        color: colors.white500,
        padding: {
            x: 30,
            y: 30,
        },
    },
};
