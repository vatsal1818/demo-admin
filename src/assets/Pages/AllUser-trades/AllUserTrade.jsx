import React, { useEffect, useState } from "react";
import axios from "axios";
import "./AllUserTrade.css";

const AllUserTrade = () => {
  const [userTrades, setUserTrades] = useState([]);
  const [filteredTrades, setFilteredTrades] = useState([]);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [editingTrade, setEditingTrade] = useState(null);
  const [dailyCharges, setDailyCharges] = useState({});
  const [chargesUpdated, setChargesUpdated] = useState({});

  useEffect(() => {
    fetchUserTrades();
  }, []);

  useEffect(() => {
    filterTradesByDateRange();
  }, [userTrades, startDate, endDate]);

  const fetchUserTrades = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/allUserTrades`
      );
      setUserTrades(response.data.data);
    } catch (err) {
      console.error("Error fetching user trades:", err);
      setError("Failed to fetch user trades");
    }
  };

  const filterTradesByDateRange = () => {
    if (!startDate && !endDate) {
      setFilteredTrades(userTrades);
    } else {
      const filtered = userTrades.map((user) => ({
        ...user,
        trades: user.trades.filter((trade) => {
          const tradeDate = new Date(trade.createdAt);
          const start = startDate ? new Date(startDate) : null;
          const end = endDate ? new Date(endDate) : null;

          if (start) start.setHours(0, 0, 0, 0);
          if (end) end.setHours(23, 59, 59, 999);

          if (start && end) {
            return tradeDate >= start && tradeDate <= end;
          } else if (start) {
            return tradeDate >= start;
          } else if (end) {
            return tradeDate <= end;
          }
          return true;
        }),
      }));
      setFilteredTrades(filtered);
    }
  };

  const handleStartDateChange = (e) => {
    setStartDate(e.target.value);
  };

  const handleEndDateChange = (e) => {
    setEndDate(e.target.value);
  };

  const handleEditClick = (trade) => {
    setEditingTrade(trade);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditingTrade((prevTrade) => ({
      ...prevTrade,
      [name]: value,
    }));
  };

  const handleSaveEdit = async () => {
    try {
      const { _id, quantity, buyPrice, sellPrice, charges, brokerage } =
        editingTrade;

      const quantityNum = Number(quantity);
      const buyPriceNum = Number(buyPrice);
      const sellPriceNum = Number(sellPrice);
      const chargesNum = Number(charges);
      const brokerageNum = Number(brokerage);

      const calculatedProfitOrLoss =
        (sellPriceNum - buyPriceNum) * quantityNum -
        (chargesNum + brokerageNum);

      const updatedTrade = {
        ...editingTrade,
        profit: calculatedProfitOrLoss > 0 ? calculatedProfitOrLoss : 0,
        loss: calculatedProfitOrLoss < 0 ? Math.abs(calculatedProfitOrLoss) : 0,
      };

      const response = await axios.put(
        `${process.env.REACT_APP_API_URL}/userTrades/${_id}`,
        updatedTrade,
        {
          headers: {
            Authorization: `Bearer ${process.env.REACT_APP_API_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status !== 200) {
        throw new Error(response.data.error || "Failed to update trade");
      }

      const updatedData = response.data;

      setUserTrades(
        userTrades.map((user) => ({
          ...user,
          trades: user.trades.map((trade) =>
            trade._id === updatedData._id ? updatedData : trade
          ),
        }))
      );
      setEditingTrade(null);
    } catch (error) {
      console.error("Error updating trade:", error);
      setError(error.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingTrade(null);
  };

  const getTodayDate = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const groupTradesByDate = (trades) => {
    // Check if trades is an array
    if (!Array.isArray(trades)) {
      console.error("Invalid trades data:", trades);
      return {};
    }

    const grouped = trades.reduce((acc, user) => {
      // Ensure user.trades is defined and is an array
      if (Array.isArray(user.trades)) {
        user.trades.forEach((trade) => {
          const tradeDate = new Date(trade.createdAt)
            .toISOString()
            .split("T")[0];
          if (!acc[tradeDate]) {
            acc[tradeDate] = [];
          }
          acc[tradeDate].push({ user, trade });
        });
      } else {
        console.error("Invalid user trades data:", user.trades);
      }
      return acc;
    }, {});

    const sortedDates = Object.keys(grouped).sort(
      (a, b) => new Date(b) - new Date(a)
    );

    return sortedDates.reduce((sortedGroup, date) => {
      sortedGroup[date] = grouped[date];
      return sortedGroup;
    }, {});
  };

  const groupedTrades = groupTradesByDate(filteredTrades);

  const calculateDailyTotals = (trades) => {
    return trades.reduce(
      (totals, { trade }) => {
        totals.profit += trade.profit || 0;
        totals.loss += trade.loss || 0;
        totals.net = totals.profit - totals.loss;
        totals.invested += trade.quantity * trade.buyPrice;
        return totals;
      },
      { profit: 0, loss: 0, net: 0, invested: 0 }
    );
  };

  const calculateOverallTotals = (groupedTrades) => {
    return Object.values(groupedTrades).reduce(
      (totals, dailyTrades) => {
        const dailyTotal = calculateDailyTotals(dailyTrades);
        totals.profit += dailyTotal.profit;
        totals.loss += dailyTotal.loss;
        totals.net += dailyTotal.net;
        totals.invested += dailyTotal.invested;
        return totals;
      },
      { profit: 0, loss: 0, net: 0, invested: 0 }
    );
  };

  const calculateProfitLossPercentage = (amount, totalInvested) => {
    if (totalInvested === 0) return 0;
    return (amount / totalInvested) * 100;
  };

  const formatPercentage = (percentage) => {
    return percentage.toFixed(2) + "%";
  };

  const handleDailyChargesChange = (date, value) => {
    setDailyCharges({
      ...dailyCharges,
      [date]: value,
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const handleUpdateDailyCharges = async (date) => {
    try {
      // Convert charges to a number before sending
      const charges = Number(dailyCharges[date]);

      console.log("Updating daily charges for:", { date, charges });

      // Send the update request
      const response = await axios.put(
        `${process.env.REACT_APP_API_URL}/updateDailyChargesForAllUsers`,
        { date, charges },
        {
          headers: {
            Authorization: `Bearer ${process.env.REACT_APP_API_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Check if the response status is 200
      if (response.status !== 200) {
        throw new Error(
          response.data.error || "Failed to update daily charges"
        );
      }

      // Fetch updated trades data
      const updatedTradesResponse = await axios.get(
        `${process.env.REACT_APP_API_URL}/allUserTrades`,
        {
          headers: {
            Authorization: `Bearer ${process.env.REACT_APP_API_TOKEN}`,
          },
        }
      );

      // Update userTrades with the latest data
      setUserTrades(updatedTradesResponse.data.data);

      // Clear daily charges input and mark charges as updated
      setDailyCharges({ ...dailyCharges, [date]: "" });
    } catch (error) {
      console.error("Error updating daily charges:", error);
      setError(error.message);
    }
  };

  if (error) {
    return <div>Error: {error}</div>;
  }

  const overallTotals = calculateOverallTotals(groupedTrades);

  return (
    <div className="all-user-trade-container">
      <h2>All User Trades</h2>
      <div className="filter-section">
        <label htmlFor="startDate">From:</label>
        <input
          type="date"
          id="startDate"
          value={startDate}
          onChange={handleStartDateChange}
          max={getTodayDate()}
        />
        <label htmlFor="endDate">To:</label>
        <input
          type="date"
          id="endDate"
          value={endDate}
          onChange={handleEndDateChange}
          max={getTodayDate()}
        />
      </div>

      <div className="overall-totals">
        <h2>Overall Totals</h2>
        <p>
          <span className="invested">
            Total Invested: {formatCurrency(overallTotals.invested)}
          </span>
          | Total Profit:{" "}
          <span className="profit">
            {formatCurrency(overallTotals.profit)} (
            {formatPercentage(
              calculateProfitLossPercentage(
                overallTotals.profit,
                overallTotals.invested
              )
            )}
            )
          </span>{" "}
          | Total Loss:{" "}
          <span className="loss">
            {formatCurrency(overallTotals.loss)} (
            {formatPercentage(
              calculateProfitLossPercentage(
                overallTotals.loss,
                overallTotals.invested
              )
            )}
            )
          </span>{" "}
          | Net Profit/Loss:{" "}
          <span className={overallTotals.net >= 0 ? "profit" : "loss"}>
            {formatCurrency(overallTotals.net)} (
            {formatPercentage(
              calculateProfitLossPercentage(
                overallTotals.net,
                overallTotals.invested
              )
            )}
            )
          </span>
        </p>
      </div>

      {Object.keys(groupedTrades).length === 0 ? (
        <p>No trades available.</p>
      ) : (
        Object.keys(groupedTrades).map((date) => {
          const dailyTotals = calculateDailyTotals(groupedTrades[date]);
          const totalInvested = dailyTotals.profit + dailyTotals.loss;
          return (
            <div key={date} className="trades-by-date">
              <div className="daily-totals">
                <h3>{new Date(date).toDateString()}</h3>
                <p>
                  <span className="invested">
                    Daily Invested: {formatCurrency(dailyTotals.invested)}
                  </span>{" "}
                  | Daily Profit:{" "}
                  <span className="profit">
                    {formatCurrency(dailyTotals.profit)} (
                    {formatPercentage(
                      calculateProfitLossPercentage(
                        dailyTotals.profit,
                        dailyTotals.invested
                      )
                    )}
                    )
                  </span>{" "}
                  | Daily Loss:{" "}
                  <span className="loss">
                    {formatCurrency(dailyTotals.loss)} (
                    {formatPercentage(
                      calculateProfitLossPercentage(
                        dailyTotals.loss,
                        dailyTotals.invested
                      )
                    )}
                    )
                  </span>{" "}
                  | Net Profit/Loss:{" "}
                  <span className={dailyTotals.net >= 0 ? "profit" : "loss"}>
                    {formatCurrency(dailyTotals.net)} (
                    {formatPercentage(
                      calculateProfitLossPercentage(
                        dailyTotals.net,
                        dailyTotals.invested
                      )
                    )}
                    )
                  </span>
                </p>
              </div>
              <table className="trades-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Strike Name</th>
                    <th>Qty</th>
                    <th>Buy Price</th>
                    <th>Total Invested</th>
                    <th>Sell Price</th>
                    <th>Charges</th>
                    <th>Brokerage</th>
                    <th>Profit</th>
                    <th>Loss</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedTrades[date].map(({ user, trade }) => (
                    <tr key={trade._id}>
                      {editingTrade && editingTrade._id === trade._id ? (
                        <>
                          <td>{user.username}</td>
                          <td>
                            <input
                              name="strikeName"
                              value={editingTrade.strikeName || ""}
                              onChange={handleChange}
                            />
                          </td>
                          <td>
                            <input
                              name="quantity"
                              type="number"
                              value={editingTrade.quantity || ""}
                              onChange={handleChange}
                            />
                          </td>
                          <td>
                            <input
                              name="buyPrice"
                              type="number"
                              value={editingTrade.buyPrice || ""}
                              onChange={handleChange}
                            />
                          </td>
                          <td>
                            {formatCurrency(
                              editingTrade.quantity * editingTrade.buyPrice
                            )}
                          </td>
                          <td>
                            <input
                              name="sellPrice"
                              type="number"
                              value={editingTrade.sellPrice || ""}
                              onChange={handleChange}
                            />
                          </td>
                          <td>
                            <input
                              name="charges"
                              type="number"
                              value={editingTrade.charges || ""}
                              onChange={handleChange}
                            />
                          </td>
                          <td>
                            <input
                              name="brokerage"
                              type="number"
                              value={editingTrade.brokerage || ""}
                              onChange={handleChange}
                            />
                          </td>
                          <td>₹{editingTrade.profit}</td>
                          <td>₹{editingTrade.loss}</td>
                          <td>
                            <button onClick={handleSaveEdit}>Save</button>
                            <button onClick={handleCancelEdit}>Cancel</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{user.username}</td>
                          <td>{trade.strikeName}</td>
                          <td>{trade.quantity}</td>
                          <td>{formatCurrency(trade.buyPrice)}</td>
                          <td>
                            {formatCurrency(trade.quantity * trade.buyPrice)}
                          </td>
                          <td>{formatCurrency(trade.sellPrice)}</td>
                          <td>{formatCurrency(trade.charges)}</td>
                          <td>{formatCurrency(trade.brokerage)}</td>
                          <td>
                            <span className="profit">
                              {trade.profit
                                ? `${formatCurrency(
                                    trade.profit
                                  )} (${formatPercentage(
                                    calculateProfitLossPercentage(
                                      trade.profit,
                                      trade.quantity * trade.buyPrice
                                    )
                                  )})`
                                : "N/A"}
                            </span>
                          </td>
                          <td>
                            <span className="loss">
                              {trade.loss
                                ? `${formatCurrency(
                                    trade.loss
                                  )} (${formatPercentage(
                                    calculateProfitLossPercentage(
                                      trade.loss,
                                      trade.quantity * trade.buyPrice
                                    )
                                  )})`
                                : "N/A"}
                            </span>
                          </td>
                          <td>
                            <button onClick={() => handleEditClick(trade)}>
                              Edit
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="daily-charges-update">
                <input
                  type="number"
                  value={dailyCharges[date] || ""}
                  onChange={(e) =>
                    handleDailyChargesChange(date, e.target.value)
                  }
                  placeholder="Enter daily charges"
                />
                <button onClick={() => handleUpdateDailyCharges(date)}>
                  Update Daily Charges
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default AllUserTrade;
