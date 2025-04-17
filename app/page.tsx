"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Copy } from "lucide-react";

export default function BettingCalculator() {
  const [activeTab, setActiveTab] = useState("backLay");
  
  // Back/Lay calculator state
  const [type, setType] = useState("qualifier");
  const [backStake, setBackStake] = useState("");
  const [backOdds, setBackOdds] = useState("");
  const [layOdds, setLayOdds] = useState("");
  const [commission, setCommission] = useState(6);

  // Dutch betting state - both 2-way and 3-way
  const [dutchTotalStake, setDutchTotalStake] = useState("");
  const [homeOdds, setHomeOdds] = useState("");
  const [homeStake, setHomeStake] = useState("");
  const [awayOdds, setAwayOdds] = useState("");
  const [awayStake, setAwayStake] = useState("");
  const [drawOdds, setDrawOdds] = useState("");
  const [drawStake, setDrawStake] = useState("");
  
  // SNR checkbox
  const [homeSNR, setHomeSNR] = useState(false);
  const [awaySNR, setAwaySNR] = useState(false);
  const [drawSNR, setDrawSNR] = useState(false);

  // Matched betting variables
  const [lay, setLay] = useState(0);
  const [liab, setLiab] = useState(0);
  const [profitIfBack, setProfitIfBack] = useState(0);
  const [profitIfLay, setProfitIfLay] = useState(0);

  // Matched betting calculations
  useEffect(() => {
    if (activeTab === "backLay") {
      calculateMatchedBet();
    }
  }, [type, backStake, backOdds, layOdds, commission, activeTab]);

  // Update total stake when individual stakes change
  useEffect(() => {
    if (activeTab === "dutch" || activeTab === "threeWay") {
      const total = activeTab === "dutch" 
        ? parseFloat(homeStake || 0) + parseFloat(awayStake || 0)
        : parseFloat(homeStake || 0) + parseFloat(drawStake || 0) + parseFloat(awayStake || 0);
      
      setDutchTotalStake(total > 0 ? total : "");
    }
  }, [homeStake, awayStake, drawStake, activeTab]);

  // Calculate matched betting values
  const calculateMatchedBet = () => {
    // Check for valid inputs
    if (!backStake || !backOdds || !layOdds) {
      setLay(0);
      setLiab(0);
      setProfitIfBack(0);
      setProfitIfLay(0);
      return;
    }

    const bStake = parseFloat(backStake);
    const bOdds = parseFloat(backOdds);
    const lOdds = parseFloat(layOdds);
    const comm = parseFloat(commission) / 100;

    let newLay = 0;
    let newLiab = 0;
    let newProfitIfBack = 0;
    let newProfitIfLay = 0;

    if (type === "qualifier") {
      // Formula that balances the profit/loss on both sides
      const backWin = bStake * bOdds - bStake;
      const denominator = lOdds - 1 + (1 - comm);
      newLay = (backWin + bStake) / denominator;
      
      newLiab = newLay * (lOdds - 1);
      newProfitIfBack = bStake * (bOdds - 1) - newLiab;
      newProfitIfLay = newLay * (1 - comm) - bStake;
    } else if (type === "snr") {
      // SNR (Stake Not Returned) - bonus bets
      const backProfit = bStake * (bOdds - 1);
      
      // Calculate lay stake for equal profit on both sides
      newLay = backProfit / (lOdds + (1 - comm) - 1);
      
      newLiab = newLay * (lOdds - 1);
      newProfitIfBack = backProfit - newLiab;
      newProfitIfLay = newLay * (1 - comm);
    } else if (type === "sr") {
      // SR (Stake Returned) - free bets where stake is returned
      
      // Calculate lay stake for even profit
      // Lay stake = (back odds * free bet value) / (lay odds - commission)
      newLay = (bOdds * bStake) / (lOdds - comm);
      
      // Calculate liability
      newLiab = newLay * (lOdds - 1);
      
      // Calculate profit if back bet wins:
      // Profit = free bet value * back odds - lay stake * (lay odds - 1)
      newProfitIfBack = bStake * bOdds - newLiab;
      
      // Calculate profit if lay bet wins:
      // Profit = (1 - commission) * lay stake
      newProfitIfLay = newLay * (1 - comm);
    }

    setLay(newLay);
    setLiab(newLiab);
    setProfitIfBack(newProfitIfBack);
    setProfitIfLay(newProfitIfLay);
  };

  // Calculate profit for each Dutch betting outcome
  const calculateDutchProfit = (outcome) => {
    if (!homeOdds || !awayOdds) return 0;
    
    const hStake = parseFloat(homeStake || 0);
    const aStake = parseFloat(awayStake || 0);
    const hOdds = parseFloat(homeOdds);
    const aOdds = parseFloat(awayOdds);
    
    if (outcome === "home") {
      if (homeSNR) {
        // For SNR home bet - it's a free bet, so we get winnings only
        const homeWinnings = hStake * (hOdds - 1);
        return homeWinnings - aStake;
      } else if (awaySNR) {
        // If away is SNR (free bet), then when home wins, we don't lose the away stake
        const homeReturn = hStake * hOdds;
        return homeReturn - hStake; // Don't subtract the away stake as it's free
      } else {
        // Normal bet - full stake and winnings returned
        const homeReturn = hStake * hOdds;
        return homeReturn - hStake - aStake;
      }
    } else if (outcome === "away") {
      if (awaySNR) {
        // For SNR away bet - it's a free bet, so we get winnings only
        const awayWinnings = aStake * (aOdds - 1);
        return awayWinnings - hStake;
      } else if (homeSNR) {
        // If home is SNR (free bet), then when away wins, we don't lose the home stake
        const awayReturn = aStake * aOdds;
        return awayReturn - aStake; // Don't subtract the home stake as it's free
      } else {
        // Both are normal bets
        const awayReturn = aStake * aOdds;
        return awayReturn - aStake - hStake;
      }
    }
    return 0;
  };

  // Calculate 3-way Dutch profit
  const calculateThreeWayProfit = (outcome) => {
    if (!homeOdds || !drawOdds || !awayOdds) return 0;
    
    const hStake = parseFloat(homeStake || 0);
    const dStake = parseFloat(drawStake || 0);
    const aStake = parseFloat(awayStake || 0);
    const hOdds = parseFloat(homeOdds);
    const dOdds = parseFloat(drawOdds);
    const aOdds = parseFloat(awayOdds);
    const totalStake = hStake + dStake + aStake;
    
    if (outcome === "home") {
      return hStake * hOdds - totalStake;
    } else if (outcome === "draw") {
      return dStake * dOdds - totalStake;
    } else if (outcome === "away") {
      return aStake * aOdds - totalStake;
    }
    return 0;
  };

  // Calculate proportional stakes for Dutch betting
  const calculateProportionalStakes = () => {
    if (activeTab === "dutch") {
      if (!homeOdds || !awayOdds) return;
      
      if (parseFloat(homeStake) > 0 && (!awayStake || parseFloat(awayStake) === 0)) {
        // Calculate away stake based on home stake and SNR status
        if (homeSNR) {
          // For SNR home bet - it's a free bet (winnings only)
          const homeWinnings = parseFloat(homeStake) * (parseFloat(homeOdds) - 1);
          // Calculate away stake that gives same profit whether home or away wins
          const awayStakeValue = (homeWinnings / parseFloat(awayOdds)).toFixed(2);
          setAwayStake(awayStakeValue);
        } else {
          // Regular calculation - standard dutching formula
          const awayStakeValue = (parseFloat(homeStake) * parseFloat(homeOdds) / parseFloat(awayOdds)).toFixed(2);
          setAwayStake(awayStakeValue);
        }
      } else if (parseFloat(awayStake) > 0 && (!homeStake || parseFloat(homeStake) === 0)) {
        // Calculate home stake based on away stake and SNR status
        if (awaySNR) {
          // For SNR away bet - it's a free bet (winnings only)
          const awayWinnings = parseFloat(awayStake) * (parseFloat(awayOdds) - 1);
          // Calculate home stake that gives same profit whether home or away wins
          const homeStakeValue = (awayWinnings / parseFloat(homeOdds)).toFixed(2);
          setHomeStake(homeStakeValue);
        } else {
          // Regular calculation - standard dutching formula
          const homeStakeValue = (parseFloat(awayStake) * parseFloat(awayOdds) / parseFloat(homeOdds)).toFixed(2);
          setHomeStake(homeStakeValue);
        }
      }
    } else if (activeTab === "threeWay") {
      if (!homeOdds || !drawOdds || !awayOdds) return;
      
      if (parseFloat(homeStake) > 0 && (!drawStake || parseFloat(drawStake) === 0) && (!awayStake || parseFloat(awayStake) === 0)) {
        // Calculate return required
        const requiredReturn = parseFloat(homeStake) * parseFloat(homeOdds);
        
        // Calculate other stakes to match same return
        const drawStakeValue = (requiredReturn / parseFloat(drawOdds)).toFixed(2);
        const awayStakeValue = (requiredReturn / parseFloat(awayOdds)).toFixed(2);
        
        setDrawStake(drawStakeValue);
        setAwayStake(awayStakeValue);
      } else if (parseFloat(drawStake) > 0 && (!homeStake || parseFloat(homeStake) === 0) && (!awayStake || parseFloat(awayStake) === 0)) {
        // Calculate return required
        const requiredReturn = parseFloat(drawStake) * parseFloat(drawOdds);
        
        // Calculate other stakes to match same return
        const homeStakeValue = (requiredReturn / parseFloat(homeOdds)).toFixed(2);
        const awayStakeValue = (requiredReturn / parseFloat(awayOdds)).toFixed(2);
        
        setHomeStake(homeStakeValue);
        setAwayStake(awayStakeValue);
      } else if (parseFloat(awayStake) > 0 && (!homeStake || parseFloat(homeStake) === 0) && (!drawStake || parseFloat(drawStake) === 0)) {
        // Calculate return required
        const requiredReturn = parseFloat(awayStake) * parseFloat(awayOdds);
        
        // Calculate other stakes to match same return
        const homeStakeValue = (requiredReturn / parseFloat(homeOdds)).toFixed(2);
        const drawStakeValue = (requiredReturn / parseFloat(drawOdds)).toFixed(2);
        
        setHomeStake(homeStakeValue);
        setDrawStake(drawStakeValue);
      }
    }
  };

  // Calculate optimal stakes from scratch
  const calculateOptimalStakes = () => {
    if (activeTab === "dutch") {
      if (!homeOdds || !awayOdds || !dutchTotalStake) return;
      
      // First check if any existing stakes should be preserved
      if (parseFloat(homeStake) > 0 && (!awayStake || parseFloat(awayStake) === 0)) {
        calculateProportionalStakes();
        return;
      } else if (parseFloat(awayStake) > 0 && (!homeStake || parseFloat(homeStake) === 0)) {
        calculateProportionalStakes();
        return;
      }
      
      // Otherwise calculate from scratch using implied probabilities
      const totalStakeValue = parseFloat(dutchTotalStake);
      const homeProb = 1 / parseFloat(homeOdds);
      const awayProb = 1 / parseFloat(awayOdds);
      const totalProb = homeProb + awayProb;
      
      // For a given total stake, calculate optimal distribution
      const optimalHomeStake = (totalStakeValue * (homeProb / totalProb)).toFixed(2);
      const optimalAwayStake = (totalStakeValue * (awayProb / totalProb)).toFixed(2);
      
      setHomeStake(optimalHomeStake);
      setAwayStake(optimalAwayStake);
      
      // Clear SNR checkboxes when optimizing from scratch
      setHomeSNR(false);
      setAwaySNR(false);
    } else if (activeTab === "threeWay") {
      if (!homeOdds || !drawOdds || !awayOdds || !dutchTotalStake) return;
      
      // First check if any existing stakes should be preserved
      if (parseFloat(homeStake) > 0 && (!drawStake || parseFloat(drawStake) === 0) && (!awayStake || parseFloat(awayStake) === 0)) {
        calculateProportionalStakes();
        return;
      } else if (parseFloat(drawStake) > 0 && (!homeStake || parseFloat(homeStake) === 0) && (!awayStake || parseFloat(awayStake) === 0)) {
        calculateProportionalStakes();
        return;
      } else if (parseFloat(awayStake) > 0 && (!homeStake || parseFloat(homeStake) === 0) && (!drawStake || parseFloat(drawStake) === 0)) {
        calculateProportionalStakes();
        return;
      }
      
      // Otherwise calculate from scratch using implied probabilities
      const totalStakeValue = parseFloat(dutchTotalStake);
      const homeProb = 1 / parseFloat(homeOdds);
      const drawProb = 1 / parseFloat(drawOdds);
      const awayProb = 1 / parseFloat(awayOdds);
      const totalProb = homeProb + drawProb + awayProb;
      
      // For a given total stake, calculate optimal distribution
      const optimalHomeStake = (totalStakeValue * (homeProb / totalProb)).toFixed(2);
      const optimalDrawStake = (totalStakeValue * (drawProb / totalProb)).toFixed(2);
      const optimalAwayStake = (totalStakeValue * (awayProb / totalProb)).toFixed(2);
      
      setHomeStake(optimalHomeStake);
      setDrawStake(optimalDrawStake);
      setAwayStake(optimalAwayStake);
    }
  };

  const percentReturn = (backStake && Math.min(profitIfBack, profitIfLay) > 0) 
    ? (Math.min(profitIfBack, profitIfLay) / parseFloat(backStake)) * 100 
    : 0;

  // Custom styles for darker theme with lighter buttons
  const styles = {
    container: {
      backgroundColor: "#1e293b", // Darker blue
      padding: "20px",
      borderRadius: "8px",
      color: "#e2e8f0", // Light gray text
      maxWidth: "900px",
      margin: "0 auto",
    },
    tabBar: {
      display: "flex",
      backgroundColor: "#0f172a",
      borderRadius: "8px",
      overflow: "hidden",
      marginBottom: "20px",
    },
    tab: {
      flex: 1,
      padding: "12px",
      textAlign: "center",
      cursor: "pointer",
      backgroundColor: "#1e293b",
      color: "#e2e8f0",
      border: "none",
    },
    activeTab: {
      backgroundColor: "#94a3b8", // Light grey instead of blue
      color: "#ffffff",
    },
    card: {
      backgroundColor: "#0f172a", // Darker blue
      color: "#e2e8f0",
      borderRadius: "8px",
      padding: "20px",
    },
    inputGroup: {
      marginBottom: "16px",
    },
    label: {
      display: "block",
      marginBottom: "6px",
      color: "#e2e8f0",
    },
    input: {
      width: "100%",
      padding: "10px",
      backgroundColor: "#1e293b",
      border: "1px solid #334155",
      borderRadius: "4px",
      color: "#e2e8f0",
    },
    resultCard: {
      backgroundColor: "#1e293b",
      borderRadius: "6px",
      padding: "15px",
      marginTop: "20px",
    },
    profit: {
      color: "#4ade80", // Green
    },
    loss: {
      color: "#f87171", // Red
    },
    rowHeader: {
      display: "flex",
      marginBottom: "15px",
    },
    column: {
      flex: 1,
      padding: "0 10px",
    },
    teamBlock: {
      backgroundColor: "#1e293b",
      padding: "15px",
      borderRadius: "6px",
      marginBottom: "15px",
    },
    teamHeader: {
      padding: "12px",
      textAlign: "center",
      borderRadius: "4px",
      marginBottom: "15px",
      color: "white",
      fontWeight: "bold",
    },
    teamA: {
      backgroundColor: "#94a3b8", // Light grey instead of blue
    },
    teamB: {
      backgroundColor: "#94a3b8", // Light grey instead of red
    },
    draw: {
      backgroundColor: "#94a3b8", // Light grey (unchanged)
    },
    checkboxContainer: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      marginBottom: "10px",
    },
    checkbox: {
      marginRight: "6px",
    },
    clearButton: {
      backgroundColor: "#94a3b8", // Light grey instead of red
      color: "white",
      border: "none",
      padding: "10px 20px",
      borderRadius: "4px",
      cursor: "pointer",
      marginTop: "20px",
    },
    optimizeButton: {
      backgroundColor: "#94a3b8", // Light grey instead of blue
      color: "white",
      border: "none",
      padding: "10px 20px",
      borderRadius: "4px",
      cursor: "pointer",
      marginTop: "20px",
      marginRight: "10px",
    },
    copyButton: {
      backgroundColor: "transparent",
      border: "none",
      color: "#94a3b8",
      cursor: "pointer",
      padding: "0",
      display: "inline-flex",
      alignItems: "center",
      marginLeft: "5px",
    },
    summary: {
      backgroundColor: "#334155",
      padding: "15px",
      borderRadius: "6px",
      marginTop: "20px",
    },
    threeColumnGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: "15px",
      marginBottom: "15px",
    },
    twoColumnGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "15px",
      marginBottom: "15px",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.tabBar}>
        <button 
          style={activeTab === "backLay" ? {...styles.tab, ...styles.activeTab} : styles.tab}
          onClick={() => setActiveTab("backLay")}
        >
          Back/Lay
        </button>
        <button 
          style={activeTab === "dutch" ? {...styles.tab, ...styles.activeTab} : styles.tab}
          onClick={() => setActiveTab("dutch")}
        >
          Dutch Betting
        </button>
        <button 
          style={activeTab === "threeWay" ? {...styles.tab, ...styles.activeTab} : styles.tab}
          onClick={() => setActiveTab("threeWay")}
        >
          Three-Way Dutch
        </button>
      </div>

      {activeTab === "backLay" && (
        <div style={styles.card}>
          <div style={styles.tabBar}>
            <button 
              style={type === "qualifier" ? {...styles.tab, ...styles.activeTab} : styles.tab}
              onClick={() => setType("qualifier")}
            >
              Mug / Qualifier
            </button>
            <button 
              style={type === "snr" ? {...styles.tab, ...styles.activeTab} : styles.tab}
              onClick={() => setType("snr")}
            >
              SNR Bonus
            </button>
            <button 
              style={type === "sr" ? {...styles.tab, ...styles.activeTab} : styles.tab}
              onClick={() => setType("sr")}
            >
              SR Bonus
            </button>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Back Stake</label>
            <input 
              type="number" 
              value={backStake} 
              onChange={(e) => setBackStake(e.target.value)} 
              style={styles.input}
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Back Odds</label>
            <input 
              type="number" 
              value={backOdds} 
              onChange={(e) => setBackOdds(e.target.value)} 
              style={styles.input}
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Lay Odds</label>
            <input 
              type="number" 
              value={layOdds} 
              onChange={(e) => setLayOdds(e.target.value)} 
              style={styles.input}
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Exchange Commission (%)</label>
            <input 
              type="number" 
              value={commission} 
              onChange={(e) => setCommission(e.target.value)} 
              style={styles.input}
            />
          </div>

          <div style={styles.resultCard}>
            <p>
              <strong>Lay Stake:</strong> {lay ? lay.toFixed(2) : "0.00"}
              <button style={styles.copyButton}><Copy size={16} /></button>
            </p>
            <p><strong>Liability:</strong> {liab ? liab.toFixed(2) : "0.00"}</p>
            <p style={profitIfBack >= 0 ? styles.profit : styles.loss}>
              <strong>Profit if Back Wins:</strong> {profitIfBack ? profitIfBack.toFixed(2) : "0.00"}
            </p>
            <p style={profitIfLay >= 0 ? styles.profit : styles.loss}>
              <strong>Profit if Lay Wins:</strong> {profitIfLay ? profitIfLay.toFixed(2) : "0.00"}
            </p>
            <p>The percentage return of this bet is... 
              <span style={percentReturn >= 0 ? styles.profit : styles.loss}>
                {" "}{percentReturn.toFixed(2)}%
              </span>
            </p>
          </div>

          <button style={styles.clearButton} onClick={() => {
            setBackStake("");
            setBackOdds("");
            setLayOdds("");
            setCommission(6);
          }}>
            Clear Fields
          </button>
        </div>
      )}

      {activeTab === "dutch" && (
        <div style={styles.card}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Total Stake</label>
            <input 
              type="number" 
              value={dutchTotalStake} 
              onChange={(e) => setDutchTotalStake(e.target.value)} 
              style={styles.input}
            />
          </div>

          <div style={styles.twoColumnGrid}>
            <div>
              <div style={{...styles.teamHeader, ...styles.teamA}}>Home Win</div>
              
              <div style={styles.checkboxContainer}>
                <input 
                  type="checkbox" 
                  id="homeSNR"
                  checked={homeSNR} 
                  onChange={() => {
                    setHomeSNR(!homeSNR);
                    if (homeSNR !== !homeSNR && awaySNR) setAwaySNR(false);
                  }}
                  style={styles.checkbox}
                />
                <label htmlFor="homeSNR">SNR</label>
              </div>
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>Odds</label>
                <input 
                  type="number" 
                  value={homeOdds} 
                  onChange={(e) => setHomeOdds(e.target.value)} 
                  style={styles.input}
                />
              </div>
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>Stake</label>
                <input 
                  type="number" 
                  value={homeStake} 
                  onChange={(e) => setHomeStake(e.target.value)} 
                  style={styles.input}
                />
              </div>
              
              <p>
                <strong>Stake:</strong> {parseFloat(homeStake || 0).toFixed(2)}
                <button style={styles.copyButton}><Copy size={16} /></button>
              </p>
              
              <p style={calculateDutchProfit("home") >= 0 ? styles.profit : styles.loss}>
                <strong>Profit if Home Wins:</strong> {calculateDutchProfit("home").toFixed(2)}
              </p>
            </div>

            <div>
              <div style={{...styles.teamHeader, ...styles.teamB}}>Away Win</div>
              
              <div style={styles.checkboxContainer}>
                <input 
                  type="checkbox" 
                  id="awaySNR"
                  checked={awaySNR} 
                  onChange={() => {
                    setAwaySNR(!awaySNR);
                    if (awaySNR !== !awaySNR && homeSNR) setHomeSNR(false);
                  }}
                  style={styles.checkbox}
                />
                <label htmlFor="awaySNR">SNR</label>
              </div>
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>Odds</label>
                <input 
                  type="number" 
                  value={awayOdds} 
                  onChange={(e) => setAwayOdds(e.target.value)} 
                  style={styles.input}
                />
              </div>
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>Stake</label>
                <input 
                  type="number" 
                  value={awayStake} 
                  onChange={(e) => setAwayStake(e.target.value)} 
                  style={styles.input}
                />
              </div>
              
              <p>
                <strong>Stake:</strong> {parseFloat(awayStake || 0).toFixed(2)}
                <button style={styles.copyButton}><Copy size={16} /></button>
              </p>
              
              <p style={calculateDutchProfit("away") >= 0 ? styles.profit : styles.loss}>
                <strong>Profit if Away Wins:</strong> {calculateDutchProfit("away").toFixed(2)}
              </p>
            </div>
          </div>

          <div style={styles.summary}>
            <p><strong>Total Stake:</strong> {(parseFloat(homeStake || 0) + parseFloat(awayStake || 0)).toFixed(2)}</p>
            <p style={{marginTop: "10px"}}><strong>Place these bets to lock in profit:</strong></p>
            <p style={styles.profit}>${parseFloat(homeStake || 0).toFixed(2)} on Home at the best available odds.</p>
            <p style={styles.profit}>${parseFloat(awayStake || 0).toFixed(2)} on Away at the best available odds.</p>
          </div>

          <div>
            <button style={styles.optimizeButton} onClick={calculateProportionalStakes}>
              Optimize Stakes
            </button>
            <button style={styles.clearButton} onClick={() => {
              setHomeStake("");
              setAwayStake("");
              setHomeOdds("");
              setAwayOdds("");
              setDutchTotalStake("");
              setHomeSNR(false);
              setAwaySNR(false);
            }}>
              Clear Fields
            </button>
          </div>
        </div>
      )}

      {activeTab === "threeWay" && (
        <div style={styles.card}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Total Stake</label>
            <input 
              type="number" 
              value={dutchTotalStake} 
              onChange={(e) => setDutchTotalStake(e.target.value)} 
              style={styles.input}
            />
          </div>

          <div style={styles.threeColumnGrid}>
            <div>
              <div style={{...styles.teamHeader, ...styles.teamA}}>Home Win</div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Odds</label>
                <input 
                  type="number" 
                  value={homeOdds} 
                  onChange={(e) => setHomeOdds(e.target.value)} 
                  style={styles.input}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Stake</label>
                <input 
                  type="number" 
                  value={homeStake} 
                  onChange={(e) => setHomeStake(e.target.value)} 
                  style={styles.input}
                />
              </div>
              <p>
                <strong>Stake:</strong> {parseFloat(homeStake || 0).toFixed(2)}
                <button style={styles.copyButton}><Copy size={16} /></button>
              </p>
              <p style={calculateThreeWayProfit("home") >= 0 ? styles.profit : styles.loss}>
                <strong>Profit if Home Wins:</strong> {calculateThreeWayProfit("home").toFixed(2)}
              </p>
            </div>

            <div>
              <div style={{...styles.teamHeader, ...styles.draw}}>Draw</div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Odds</label>
                <input 
                  type="number" 
                  value={drawOdds} 
                  onChange={(e) => setDrawOdds(e.target.value)} 
                  style={styles.input}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Stake</label>
                <input 
                  type="number" 
                  value={drawStake} 
                  onChange={(e) => setDrawStake(e.target.value)} 
                  style={styles.input}
                />
              </div>
              <p>
                <strong>Stake:</strong> {parseFloat(drawStake || 0).toFixed(2)}
                <button style={styles.copyButton}><Copy size={16} /></button>
              </p>
              <p style={calculateThreeWayProfit("draw") >= 0 ? styles.profit : styles.loss}>
                <strong>Profit if Draw:</strong> {calculateThreeWayProfit("draw").toFixed(2)}
              </p>
            </div>

            <div>
              <div style={{...styles.teamHeader, ...styles.teamB}}>Away Win</div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Odds</label>
                <input 
                  type="number" 
                  value={awayOdds} 
                  onChange={(e) => setAwayOdds(e.target.value)} 
                  style={styles.input}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Stake</label>
                <input 
                  type="number" 
                  value={awayStake} 
                  onChange={(e) => setAwayStake(e.target.value)} 
                  style={styles.input}
                />
              </div>
              <p>
                <strong>Stake:</strong> {parseFloat(awayStake || 0).toFixed(2)}
                <button style={styles.copyButton}><Copy size={16} /></button>
              </p>
              <p style={calculateThreeWayProfit("away") >= 0 ? styles.profit : styles.loss}>
                <strong>Profit if Away Wins:</strong> {calculateThreeWayProfit("away").toFixed(2)}
              </p>
            </div>
          </div>

          <div style={styles.summary}>
            <p><strong>Total Stake:</strong> {(parseFloat(homeStake || 0) + parseFloat(drawStake || 0) + parseFloat(awayStake || 0)).toFixed(2)}</p>
            <p style={{marginTop: "10px"}}><strong>Place these bets to lock in profit:</strong></p>
            <p style={styles.profit}>${parseFloat(homeStake || 0).toFixed(2)} on Home at the best available odds.</p>
            <p style={styles.profit}>${parseFloat(drawStake || 0).toFixed(2)} on Draw at the best available odds.</p>
            <p style={styles.profit}>${parseFloat(awayStake || 0).toFixed(2)} on Away at the best available odds.</p>
          </div>

          <div>
            <button style={styles.optimizeButton} onClick={calculateProportionalStakes}>
              Optimize Stakes
            </button>
            <button style={styles.clearButton} onClick={() => {
              setHomeStake("");
              setDrawStake("");
              setAwayStake("");
              setHomeOdds("");
              setDrawOdds("");
              setAwayOdds("");
              setDutchTotalStake("");
            }}>
              Clear Fields
            </button>
          </div>
        </div>
      )}
    </div>
  );
}