/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/rules-of-hooks */
import Table from "react-bootstrap/Table";
import Pagination from "react-bootstrap/Pagination";
import Button from "react-bootstrap/Button";
import "./style.css";
import { useState, useEffect } from "react";
import { ethers } from "ethers";

const SenderTable = ({ wallets, setWallets, isConnected }) => {
  const [currentPage, setCurrentPage] = useState(1); // Current page for pagination
  const [itemsPerPage] = useState(5); // Items per page
  const [currentItems, setCurrentItems] = useState([]); // Current page items
  const [invalidAddresses, setInvalidAddresses] = useState([]); // Invalid addresses for feedback

  // Handle pagination logic when wallets or currentPage changes
  useEffect(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const slicedItems = wallets.slice(indexOfFirstItem, indexOfLastItem);
    setCurrentItems(slicedItems);
  }, [wallets, currentPage, itemsPerPage]);

  // Handle page change
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Upload wallet addresses from a CSV file
  const uploadWallet = async () => {
    try {
      const response = await fetch(process.env.PUBLIC_URL + "/wallets.csv");
      const data = await response.text();

      // Parse addresses from CSV
      const rawAddresses = data
        .replace(/\s/g, "") // Remove extra spaces
        .split(",")
        .filter((item) => item !== ""); // Filter empty strings

      const validAddresses = [];
      const invalidAddresses = [];
      const seenAddresses = new Set(); // To track duplicates

      // Validate each address
      rawAddresses.forEach((address) => {
        if (ethers.isAddress(address)) {
          // If valid and not a duplicate, add to validAddresses
          if (!seenAddresses.has(address.toLowerCase())) {
            validAddresses.push(address);
            seenAddresses.add(address.toLowerCase()); // Normalize to lowercase for duplicate check
          }
        } else {
          // If invalid, add to invalidAddresses
          invalidAddresses.push(address);
        }
      });

      // Update state with valid addresses and invalid addresses
      setWallets(validAddresses);
      setInvalidAddresses(invalidAddresses);

      // Feedback for invalid entries
      if (invalidAddresses.length > 0) {
        alert(`Invalid addresses found:\n${invalidAddresses.join("\n")}`);
      }

      if (validAddresses.length === 0) {
        alert("No valid addresses found in the uploaded file.");
      }
    } catch (error) {
      console.error("Failed to upload wallets:", error);
      alert("Error uploading wallets. Please check the file and try again.");
    }
  };

  return (
    <div>
      <Table responsive>
        <thead>
          <tr>
            <th>No</th>
            <th>Wallet Address</th>
          </tr>
        </thead>
        <tbody>
          {currentItems.length > 0 ? (
            currentItems.map((wallet, idx) => (
              <tr key={idx}>
                <td>{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                <td>{wallet}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="2" style={{ textAlign: "center" }}>
                No data
              </td>
            </tr>
          )}
        </tbody>
      </Table>

      {/* Pagination */}
      <Pagination>
        {[...Array(Math.ceil(wallets.length / itemsPerPage))].map((_, number) => (
          <Pagination.Item
            key={number}
            active={number + 1 === currentPage}
            onClick={() => handlePageChange(number + 1)}
          >
            {number + 1}
          </Pagination.Item>
        ))}
      </Pagination>

      <div className="tableButton">
        <Button
          className="uploadButton"
          disabled={!isConnected}
          onClick={uploadWallet}
        >
          Upload File
        </Button>
      </div>

      {invalidAddresses.length > 0 && (
        <div style={{ marginTop: "20px", color: "red" }}>
          <h5>Invalid Addresses:</h5>
          <ul>
            {invalidAddresses.map((address, idx) => (
              <li key={idx}>{address}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SenderTable;
