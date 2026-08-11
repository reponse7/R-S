import { createContext, useContext, useState, useEffect } from "react"

export type Currency = "RWF" | "USD"

interface AppContextState {
  currency: Currency
  setCurrency: (c: Currency) => void
  exchangeRate: number
  setExchangeRate: (rate: number) => void
  convertAmount: (amount: number, from: Currency, to: Currency) => number
  formatCurrency: (amount: number, currency?: Currency) => string
}

const initialState: AppContextState = {
  currency: "RWF",
  setCurrency: () => null,
  exchangeRate: 1320,
  setExchangeRate: () => null,
  convertAmount: (a) => a,
  formatCurrency: (a) => a.toString()
}

const AppContext = createContext<AppContextState>(initialState)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<Currency>(() => {
    return (localStorage.getItem('rs-currency') as Currency) || "RWF"
  })
  
  const [exchangeRate, setExchangeRate] = useState<number>(() => {
    const stored = localStorage.getItem('rs-exchange-rate')
    return stored ? parseFloat(stored) : 1320
  })

  useEffect(() => {
    localStorage.setItem('rs-currency', currency)
  }, [currency])

  useEffect(() => {
    localStorage.setItem('rs-exchange-rate', exchangeRate.toString())
  }, [exchangeRate])

  const convertAmount = (amount: number, from: Currency, to: Currency) => {
    if (from === to) return amount;
    if (from === "USD" && to === "RWF") return amount * exchangeRate;
    if (from === "RWF" && to === "USD") return amount / exchangeRate;
    return amount;
  }

  const formatCurrency = (amount: number, cur?: Currency) => {
    const activeCur = cur || currency;
    if (activeCur === "RWF") {
      return new Intl.NumberFormat('rw-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(amount);
    } else {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    }
  }

  return (
    <AppContext.Provider value={{ currency, setCurrency, exchangeRate, setExchangeRate, convertAmount, formatCurrency }}>
      {children}
    </AppContext.Provider>
  )
}

export const useAppContext = () => {
  const context = useContext(AppContext)
  if (context === undefined) throw new Error("useAppContext must be used within AppProvider")
  return context
}
