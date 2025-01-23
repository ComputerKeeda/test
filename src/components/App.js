import "./App.css";
import Nav from "./Nav/Nav";
import TokenPart from "./Token/Token";
import SenderTable from "./Table";
import Transfer from "./Transfer/Transfer";
import ConnectWallet from "./ConnectWallet";
import Fee from "./Fee";
import Airdrop from "./Airdrop";
import "bootstrap/dist/css/bootstrap.min.css";
import { Spinner } from "react-bootstrap";
import { useEffect, useState } from "react";
import { ethers, formatUnits } from "ethers";
import { RPC_URL, SECRET_KEY } from "./config";

// Load the sender's wallet from the private key
const provider = new ethers.JsonRpcProvider(RPC_URL);
const network = await provider.getNetwork();
console.log("Connected to network:", network);
const senderWallet = new ethers.Wallet(SECRET_KEY, provider);

function App() {
  // State variables
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [tokenAddress, setTokenAddress] = useState("0xdAC17F958D2ee523a2206206994597C13D831ec7"); // ERC-20 token contract address
  const [wallets, setWallets] = useState([]);
  const [quantity, setQuantity] = useState(0);
  const [fee, setFee] = useState(0);
  const [loading, setLoading] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState(0);

  // Fetch token balance of the connected wallet
  useEffect(() => {
    if (tokenAddress && isConnected) {
      getTokenBalance();
    }
    // eslint-disable-next-line
  }, [tokenAddress, isConnected]);

  const getTokenBalance = async () => {
    try {
      const erc20ABI = [
        "function balanceOf(address account) external view returns (uint256)",
        "function decimals() view returns (uint8)",
      ];

      if (!tokenAddress) {
        console.error("Token address is not set.");
        return;
      }
      if (!walletAddress) {
        console.error("Wallet address is not set.");
        return;
      }

      const tokenContract = new ethers.Contract(tokenAddress, erc20ABI, provider);
      console.log("Initialized contract:", tokenContract);

      // Get token decimals
      const decimals = await tokenContract.decimals();
      console.log("Token decimals:", decimals);

      // Get token balance
      const balance = await tokenContract.balanceOf(walletAddress);
      console.log("Raw balance:", balance);

      // Format balance and set state
      const formattedBalance = formatUnits(balance, decimals);
      console.log("Formatted balance:", formattedBalance);

      setBalanceAmount(Number(formattedBalance));
    } catch (error) {
      console.error("Error fetching token balance:", error);
      alert("Failed to fetch token balance. Check the token address and try again.");
    }
  };

  const handleConnect = async () => {
    try {
      if (isConnected) {
        const confirmDisconnect = window.confirm("Do you want to disconnect?");
        if (confirmDisconnect) {
          setIsConnected(false);
          setWalletAddress("");
        }
      } else {
        // Check if MetaMask is installed
        if (!window.ethereum) {
          alert("MetaMask is not installed. Please install it from https://metamask.io/");
          return;
        }

        // Request wallet connection
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        console.log(accounts[0]);
        setWalletAddress(accounts[0]);
        setIsConnected(true);
        console.log("Connected to wallet:", accounts[0]);
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      alert("Failed to connect wallet. Please try again.");
    }
  };


  const handleAirdrop = async () => {
    if (!tokenAddress || wallets.length === 0 || quantity <= 0) {
      alert("Please fill in all parameters correctly!");
      return;
    }

    // Validate wallets
    const validWallets = wallets.filter((wallet) => ethers.isAddress(wallet));
    if (validWallets.length !== wallets.length) {
      alert("Some wallet addresses are invalid. Please upload valid addresses.");
      return;
    }

    // Ensure sufficient balance
    const totalTokensRequired = quantity * validWallets.length;
    if (totalTokensRequired > balanceAmount) {
      alert("Insufficient token balance for the airdrop!");
      return;
    }

    // Estimate gas fees
    try {
      const estimatedGas = await provider.estimateGas({
        to: validWallets[0], // Example recipient
        data: "0x", // Empty data for estimation
      });

      const gasPrice = await provider.getGasPrice();
      const totalGasFee = ethers.formatEther(estimatedGas.mul(gasPrice));

      if (parseFloat(totalGasFee) > parseFloat(balanceAmount)) {
        alert("Insufficient ETH balance to cover gas fees!");
        return;
      }
    } catch (error) {
      console.error("Gas estimation failed:", error);
      alert("Failed to estimate gas. Check your connection and try again.");
      return;
    }

    setLoading(true);
    try {
      const erc20ABI = [
        "function transfer(address to, uint256 value) public returns (bool)",
        "function decimals() view returns (uint8)",
      ];
      const tokenContract = new ethers.Contract(tokenAddress, erc20ABI, senderWallet);
      const decimals = await tokenContract.decimals();
      const amount = ethers.parseUnits(quantity.toString(), decimals);

      for (let i = 0; i < validWallets.length; i++) {
        const recipient = validWallets[i];
        console.log(`Transferring ${quantity} tokens to ${recipient}...`);
        const tx = await tokenContract.transfer(recipient, amount);
        await tx.wait(); // Wait for the transaction to confirm
        console.log(`Successfully sent to ${recipient}`);
      }
      alert("Airdrop completed successfully!");
    } catch (error) {
      console.error("Airdrop failed:", error);
      alert("Airdrop failed! Check the console for more details.");
    }
    setLoading(false);
  };



  return (
    <div className="App">
      <Nav />
      <div style={{ opacity: loading ? 0.5 : 1 }}>
        {loading && (
          <div className="d-flex justify-content-center align-items-center custom-loading">
            <Spinner animation="border" variant="primary" role="status" />
          </div>
        )}
        <div className="connectWallet">
          <div className="tokenaddress-ss">
            {walletAddress === "" ? `wallet is not connected please connect your wallet` : `${walletAddress} is connected`}
          </div>
          <ConnectWallet
            handleConnect={handleConnect}
            isConnected={isConnected}
          />
        </div>
        <div className="event">
          <SenderTable wallets={wallets} setWallets={setWallets} isConnected={isConnected} />
        </div>
        <div className="main">
          <TokenPart
            tokenaddress={tokenAddress}
            setTokenAddress={setTokenAddress}
            balanceAmount={balanceAmount}
          />
          <Transfer
            quantity={quantity}
            setQuantity={setQuantity}
            totalQuantity={wallets?.length ? wallets.length * quantity : 0}
            balanceAmount={balanceAmount}
          />
          <Fee
            fee={fee}
            setFee={setFee}
            totalFee={wallets?.length ? wallets.length * fee : 0}
          />
        </div>
        <div className="airdrop">
          <Airdrop
            isConnected={
              isConnected && wallets?.length
                ? wallets.length * quantity < balanceAmount
                : 0
            }
            handleAirdrop={handleAirdrop}
          />
        </div>
        {isConnected && walletAddress && (
          <p style={{ textAlign: "center", marginTop: "20px" }}>
            <strong>Connected Wallet Address:</strong> {walletAddress}
          </p>
        )}
      </div>
    </div>
  );
}

export default App;
