import { createTheme } from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Palette {
    accent: Palette["primary"];
  }

  interface PaletteOptions {
    accent?: PaletteOptions["primary"];
  }
}

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
      default: "#F9FAFB",
      paper: "#FFFFFF"
    },
    text: {
      primary: "#1F2937",
      secondary: "#64748B"
    },
    primary: {
      main: "#14B8A6",
      dark: "#0F766E",
      contrastText: "#ffffff"
    },
    secondary: {
      main: "#84CC16",
      dark: "#4D7C0F",
      contrastText: "#1F2937"
    },
    accent: {
      main: "#84CC16",
      contrastText: "#1F2937"
    },
    divider: "#E5E7EB"
  },
  shape: {
    borderRadius: 10
  },
  typography: {
    fontFamily,
    allVariants: {
      letterSpacing: 0
    },
    h1: responsiveType({ xs: 30, sm: 30, md: 32, lg: 34, lineHeight: 1.2, fontWeight: 600 }),
    h2: responsiveType({ xs: 28, sm: 30, md: 30, lg: 32, lineHeight: 1.2, fontWeight: 600 }),
    h3: responsiveType({ xs: 30, sm: 30, md: 30, lg: 30, lineHeight: 1.2, fontWeight: 500 }),
    h4: responsiveType({ xs: 24, sm: 24, md: 24, lg: 26, lineHeight: 1.28, fontWeight: 600 }),
    h5: responsiveType({ xs: 20, sm: 20, md: 20, lg: 22, lineHeight: 1.3, fontWeight: 600 }),
    h6: responsiveType({ xs: 16, sm: 16, md: 16, lg: 17, lineHeight: 1.35, fontWeight: 600 }),
    body1: responsiveType({ xs: 16, sm: 16, md: 16, lg: 16, lineHeight: 1.5 }),
    body2: responsiveType({ xs: 14, sm: 14, md: 14, lg: 14, lineHeight: 1.43 }),
    subtitle1: responsiveType({ xs: 18, sm: 18, md: 18, lg: 18, lineHeight: 1.55, fontWeight: 600 }),
    subtitle2: responsiveType({ xs: 16, sm: 16, md: 16, lg: 16, lineHeight: 1.5, fontWeight: 600 }),
    caption: responsiveType({ xs: 12, sm: 12, md: 12, lg: 12, lineHeight: 1.33, fontWeight: 500 }),
    button: {
      textTransform: "none",
      fontWeight: 700,
      fontSize: "0.9375rem",
      lineHeight: 1.35
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
          fontSize: "16px",
          lineHeight: 1.5,
          color: "#1F2937",
          backgroundColor: "#F9FAFB"
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
          borderRadius: 10,
          letterSpacing: 0,
          boxShadow: "none"
        }
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 10
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
          borderRadius: 10
        },
        input: {
          fontSize: "1rem",
          lineHeight: 1.5
        }
      }
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: "0.875rem",
          lineHeight: 1.43
        },
        shrink: {
          fontSize: "0.8125rem",
          lineHeight: 1.25
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 14
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: "0.8125rem"
        }
      }
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: "0.875rem",
          lineHeight: 1.43
        }
      }
    }
  }
});
