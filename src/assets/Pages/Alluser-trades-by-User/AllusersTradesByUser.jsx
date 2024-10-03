import React, { useEffect, useState } from "react";
import axios from "axios";
import "./AllusersTradesByUser.css";

const AllUserTradeByUser = () => {
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

  const groupTradesByUser = (trades) => {
    return trades.reduce((acc, user) => {
      if (!acc[user.username]) {
        acc[user.username] = [];
      }
      acc[user.username].push(...user.trades);
      return acc;
    }, {});
  };

  const groupTradesByDate = (trades) => {
    const grouped = trades.reduce((acc, trade) => {
      const tradeDate = new Date(trade.createdAt).toISOString().split("T")[0];
      if (!acc[tradeDate]) {
        acc[tradeDate] = {
          trades: [],
          totals: { profit: 0, loss: 0, invested: 0, net: 0 },
        };
      }
      acc[tradeDate].trades.push(trade);

      // Update daily totals
      acc[tradeDate].totals.profit += trade.profit || 0;
      acc[tradeDate].totals.loss += trade.loss || 0;
      acc[tradeDate].totals.invested += trade.quantity * trade.buyPrice;
      acc[tradeDate].totals.net =
        acc[tradeDate].totals.profit - acc[tradeDate].totals.loss;

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

  const groupedUserTrades = groupTradesByUser(filteredTrades);

  const calculateTotalsForUser = (userTrades) => {
    return userTrades.reduce(
      (totals, trade) => {
        totals.profit += trade.profit || 0;
        totals.loss += trade.loss || 0;
        totals.net = totals.profit - totals.loss;
        totals.invested += trade.quantity * trade.buyPrice;
        return totals;
      },
      { profit: 0, loss: 0, net: 0, invested: 0 }
    );
  };

  const formatPercentage = (profitOrLoss, invested) => {
    const percentage = (profitOrLoss / invested) * 100;
    return percentage ? percentage.toFixed(2) : "0";
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const handleDailyChargesChange = (date, value) => {
    setDailyCharges({
      ...dailyCharges,
      [date]: value,
    });
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
        />
        <label htmlFor="endDate">To:</label>
        <input
          type="date"
          id="endDate"
          value={endDate}
          onChange={handleEndDateChange}
        />
      </div>

      {Object.keys(groupedUserTrades).map((username) => {
        const userTrades = groupedUserTrades[username];
        const groupedTradesByDate = groupTradesByDate(userTrades);
        const userTotals = calculateTotalsForUser(userTrades);

        return (
          <div key={username} className="user-trades-section">
            <h1>{username}</h1>

            <div className="overall-totals">
              <p>
                <span className="invested">
                  Total Invested: {formatCurrency(userTotals.invested)}
                </span>{" "}
                | Total Profit:{" "}
                <span className="profit">
                  {formatCurrency(userTotals.profit)} (
                  {formatPercentage(userTotals.profit, userTotals.invested)}%)
                </span>{" "}
                | Total Loss:{" "}
                <span className="loss">
                  {formatCurrency(userTotals.loss)} (
                  {formatPercentage(userTotals.loss, userTotals.invested)}%)
                </span>{" "}
                | Net Profit/Loss:{" "}
                <span className={userTotals.net >= 0 ? "profit" : "loss"}>
                  {formatCurrency(userTotals.net)} (
                  {formatPercentage(userTotals.net, userTotals.invested)}%)
                </span>
              </p>
            </div>

            {Object.keys(groupedTradesByDate).map((date) => {
              const { trades, totals } = groupedTradesByDate[date];

              return (
                <div key={date} className="trades-by-date">
                  <h3>{new Date(date).toDateString()}</h3>

                  {/* Daily Profit, Loss, and Net Profit/Loss Totals */}
                  <div className="daily-totals">
                    <p>
                      <span className="invested">
                        Daily Invested: {formatCurrency(totals.invested)}
                      </span>{" "}
                      | Daily Profit:{" "}
                      <span className="profit">
                        {formatCurrency(totals.profit)} (
                        {formatPercentage(totals.profit, totals.invested)}%)
                      </span>{" "}
                      | Daily Loss:{" "}
                      <span className="loss">
                        {formatCurrency(totals.loss)} (
                        {formatPercentage(totals.loss, totals.invested)}%)
                      </span>{" "}
                      | Daily Net Profit/Loss:{" "}
                      <span className={totals.net >= 0 ? "profit" : "loss"}>
                        {formatCurrency(totals.net)} (
                        {formatPercentage(totals.net, totals.invested)}%)
                      </span>
                    </p>
                  </div>

                  <table className="trades-table">
                    <thead>
                      <tr>
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
                      {trades.map((trade) => {
                        const totalInvested = trade.quantity * trade.buyPrice;
                        return (
                          <tr key={trade._id}>
                            <td>{trade.strikeName}</td>
                            <td>{trade.quantity}</td>
                            <td>{formatCurrency(trade.buyPrice)}</td>
                            <td>{formatCurrency(totalInvested)}</td>
                            <td>{formatCurrency(trade.sellPrice)}</td>
                            <td>{formatCurrency(trade.charges)}</td>
                            <td>{formatCurrency(trade.brokerage)}</td>
                            <td>
                              {formatCurrency(trade.profit)} (
                              {formatPercentage(trade.profit, totalInvested)}%)
                            </td>
                            <td>
                              {formatCurrency(trade.loss)} (
                              {formatPercentage(trade.loss, totalInvested)}%)
                            </td>
                            <td>
                              <button onClick={() => handleEditClick(trade)}>
                                Edit
                              </button>
                            </td>
                          </tr>
                        );
                      })}
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
            })}
          </div>
        );
      })}

      {editingTrade && (
        <div className="edit-modal">
          <h3>Edit Tradee</h3>
          <div className="edit-form">
            <label htmlFor="quantity">Quantity:</label>
            <input
              type="number"
              id="quantity"
              name="quantity"
              value={editingTrade.quantity}
              onChange={handleChange}
            />
            <label htmlFor="buyPrice">Buy Price:</label>
            <input
              type="number"
              id="buyPrice"
              name="buyPrice"
              value={editingTrade.buyPrice}
              onChange={handleChange}
            />
            <label htmlFor="sellPrice">Sell Price:</label>
            <input
              type="number"
              id="sellPrice"
              name="sellPrice"
              value={editingTrade.sellPrice}
              onChange={handleChange}
            />
            <label htmlFor="charges">Charges:</label>
            <input
              type="number"
              id="charges"
              name="charges"
              value={editingTrade.charges}
              onChange={handleChange}
            />
            <label htmlFor="brokerage">Brokerage:</label>
            <input
              type="number"
              id="brokerage"
              name="brokerage"
              value={editingTrade.brokerage}
              onChange={handleChange}
            />
          </div>
          <button onClick={handleSaveEdit}>Save</button>
          <button onClick={handleCancelEdit}>Cancel</button>
        </div>
      )}
    </div>
  );
};

export default AllUserTradeByUser;
