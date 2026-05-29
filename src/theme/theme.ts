import { createTheme } from "@mui/material/styles";

const fontFamily = "var(--font-sans)";

function responsiveType({
  xs,
  sm,
  md,
  lg,
  lineHeight,
  fontWeight
}: {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  lineHeight: number;
  fontWeight?: number;
}) {
  return {
    fontSize: `${xs / 16}rem`,
    lineHeight,
    ...(fontWeight ? { fontWeight } : {}),
    "@media (min-width:768px)": {
      fontSize: `${sm / 16}rem`
    },
    "@media (min-width:1024px)": {
      fontSize: `${md / 16}rem`
    },
    "@media (min-width:1440px)": {
      fontSize: `${lg / 16}rem`
    }
  };
}

export const appTheme = createTheme({
  palette: {
    mode: "light",
    background: {
      default: "#ffffff",
      paper: "#ffffff"
    },
    text: {
      primary: "#111318",
      secondary: "#686d76"
    },
    primary: {
      main: "#0a84ff",
      dark: "#0057d9",
      contrastText: "#ffffff"
    },
    divider: "#dedfe3"
  },
  shape: {
    borderRadius: 8
  },
  typography: {
    fontFamily,
    allVariants: {
      letterSpacing: 0
    },
    h1: responsiveType({ xs: 40, sm: 48, md: 48, lg: 56, lineHeight: 1.08, fontWeight: 600 }),
    h2: responsiveType({ xs: 32, sm: 48, md: 48, lg: 56, lineHeight: 1.34, fontWeight: 600 }),
    h3: responsiveType({ xs: 32, sm: 48, md: 48, lg: 56, lineHeight: 1.34, fontWeight: 600 }),
    h4: responsiveType({ xs: 28, sm: 40, md: 40, lg: 48, lineHeight: 1.25, fontWeight: 600 }),
    h5: responsiveType({ xs: 24, sm: 32, md: 32, lg: 40, lineHeight: 1.22, fontWeight: 600 }),
    h6: responsiveType({ xs: 19, sm: 19, md: 17, lg: 17, lineHeight: 1.24, fontWeight: 600 }),
    body1: responsiveType({ xs: 19, sm: 24, md: 24, lg: 28, lineHeight: 1.39 }),
    body2: responsiveType({ xs: 17, sm: 17, md: 17, lg: 17, lineHeight: 1.47 }),
    subtitle1: responsiveType({ xs: 21, sm: 24, md: 24, lg: 28, lineHeight: 1.35, fontWeight: 700 }),
    subtitle2: responsiveType({ xs: 17, sm: 19, md: 19, lg: 21, lineHeight: 1.35, fontWeight: 700 }),
    caption: responsiveType({ xs: 12, sm: 12, md: 12, lg: 12, lineHeight: 1.35, fontWeight: 600 }),
    button: {
      textTransform: "none",
      fontWeight: 800,
      fontSize: "0.9375rem",
      lineHeight: 1.25,
      "@media (min-width:1024px)": {
        fontSize: "1rem"
      }
    }
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 768,
      md: 1024,
      lg: 1440,
      xl: 1920
    }
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          minHeight: "100%"
        },
        body: {
          minHeight: "100%",
          overflow: "hidden",
          fontFamily,
          fontSize: "17px",
          lineHeight: 1.47,
          "@media (min-width:1024px)": {
            fontSize: "17px"
          }
        },
        a: {
          color: "inherit",
          textDecoration: "none"
        }
      }
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true
      },
      styleOverrides: {
        root: {
          minHeight: 40,
          borderRadius: 8,
          letterSpacing: 0
        }
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8
        }
      }
    },
    MuiTextField: {
      defaultProps: {
        size: "small"
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: "#ffffff",
          borderRadius: 8
        },
        input: {
          fontSize: "0.9375rem",
          lineHeight: 1.47,
          "@media (min-width:1024px)": {
            fontSize: "1rem"
          }
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 16
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          fontSize: "0.8125rem",
          "@media (min-width:1024px)": {
            fontSize: "0.875rem"
          }
        }
      }
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: "0.9375rem",
          lineHeight: 1.47,
          "@media (min-width:1024px)": {
            fontSize: "1rem"
          }
        }
      }
    }
  }
});
