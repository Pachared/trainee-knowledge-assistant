import { createTheme } from "@mui/material/styles";

const fontFamily = 'Roboto, "Noto Sans Thai", Arial, sans-serif';

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
    h1: {
      fontSize: "3.5rem",
      lineHeight: 1.08,
      fontWeight: 800
    },
    h2: {
      fontSize: "2.5rem",
      lineHeight: 1.12,
      fontWeight: 800
    },
    h3: {
      fontSize: "1.75rem",
      lineHeight: 1.18,
      fontWeight: 800
    },
    body1: {
      fontSize: "1.0625rem",
      lineHeight: 1.48
    },
    body2: {
      fontSize: "0.9375rem",
      lineHeight: 1.45
    },
    caption: {
      fontSize: "0.75rem",
      lineHeight: 1.35,
      fontWeight: 600
    },
    button: {
      textTransform: "none",
      fontWeight: 800
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
          overflow: "hidden"
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
          borderRadius: 8
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
          fontWeight: 700
        }
      }
    }
  }
});
