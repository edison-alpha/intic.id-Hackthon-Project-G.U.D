# Intic.id Smart Contract Documentation

![Solidity](https://img.shields.io/badge/Solidity-0.8.19-blue) ![OpenZeppelin](https://img.shields.io/badge/OpenZeppelin-5.0.0-green) ![PushChain](https://img.shields.io/badge/PushChain-Universal-purple)

**Blockchain ticketing system on PushChain Universal Network**

---

## Overview

Intic.id is a decentralized event ticketing platform with NFT tickets, marketplace, and fraud protection.

**Key Features:**
- NFT-based tickets (ERC-721)
- Secondary marketplace with royalties
- Fraud protection & community reporting
- Organizer reputation system
- Emergency refund mechanism

**Tech Stack:**
- Solidity 0.8.19
- OpenZeppelin 5.0.0
- PushChain Testnet (Chain ID: 50311)
- Standards: ERC-721, ERC-721Enumerable, EIP-2981

---

## Architecture

```
┌─────────────────┐
│ EventOrganizerV2│ - Organizer registry & reputation
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼──────┐  ┌──▼─────────────┐
│EventTicket│  │NFTMarketplaceV2│
│    V3     │  │                │
├───────────┤  ├────────────────┤
│• Minting  │  │• P2P Trading   │
│• Refunds  │  │• Offers        │
│• Fraud    │  │• Royalties     │
└───────────┘  └────────────────┘
```

**Contract Addresses (PushChain Testnet):**
- EventOrganizerV2: `0x35df...F9E7`
- NFTMarketplaceV2: `0xB30F...21C7`
- EventTicketV3: Deployed per event

---

## 1. EventOrganizerV2

Manages organizer profiles, events registry, and reputation.

### Key Functions

```solidity
// Organizer Management
function registerOrganizer(string name, string email) external
function updateProfile(string name, string description, string logo) external

// Event Registration
function registerEvent(
    address ticketContract,
    string eventName,
    uint256 eventDate
) external

// Reputation
function getOrganizerStats(address organizer)
    returns (
        uint256 totalEvents,
        uint256 totalTicketsSold,
        uint256 totalRevenue,
        uint256 completedEvents
    )
```

### Events
```solidity
event OrganizerRegistered(address indexed organizer, string name)
event EventRegistered(address indexed organizer, address ticketContract)
event ProfileUpdated(address indexed organizer)
```

---

## 2. EventTicketV3

NFT ticketing with fraud protection and refunds.

### Key Functions

```solidity
// Minting
function mintTicket(
    address to,
    string ticketType,
    string section,
    string seatNumber
) external payable

function batchMint(
    address[] recipients,
    string[] ticketTypes
) external payable

// Refunds
function refundTicket(uint256 tokenId) external
function emergencyRefundAll() external onlyOwner

// Fraud Protection
function reportFraud(string evidence) external
function lockOrganizer() external // Admin only

// Transfers
function safeTransferFrom(address from, address to, uint256 tokenId)
function transferTicket(address to, uint256 tokenId) external
```

### Important Properties

```solidity
uint256 public ticketPrice
uint256 public maxSupply
uint256 public refundDeadline
bool public refundsEnabled
bool public transfersEnabled
bool public fraudDetected
```

### Events
```solidity
event TicketMinted(uint256 tokenId, address buyer, string ticketType)
event TicketRefunded(uint256 tokenId, address buyer, uint256 amount)
event FraudReported(address reporter, string evidence)
event EmergencyRefundExecuted(uint256 totalRefunded)
```

---

## 3. NFTMarketplaceV2

Secondary market for ticket trading with royalty support.

### Key Functions

```solidity
// Listings
function listNFT(
    address nftContract,
    uint256 tokenId,
    uint256 price
) external

function buyNFT(address nftContract, uint256 tokenId) external payable

function cancelListing(address nftContract, uint256 tokenId) external

// Offers
function makeOffer(
    address nftContract,
    uint256 tokenId
) external payable

function acceptOffer(
    address nftContract,
    uint256 tokenId,
    address buyer
) external

function cancelOffer(address nftContract, uint256 tokenId) external

// Auctions
function createAuction(
    address nftContract,
    uint256 tokenId,
    uint256 startingPrice,
    uint256 duration
) external

function placeBid(address nftContract, uint256 tokenId) external payable
function finalizeAuction(address nftContract, uint256 tokenId) external
```

### Fee Structure
- Platform Fee: 2.5%
- Royalty: 5% (sent to event organizer)

### Events
```solidity
event NFTListed(address nftContract, uint256 tokenId, uint256 price)
event NFTSold(address nftContract, uint256 tokenId, address buyer, uint256 price)
event OfferMade(address nftContract, uint256 tokenId, address buyer, uint256 amount)
event AuctionCreated(address nftContract, uint256 tokenId, uint256 startingPrice)
```

---

## Security Features

### Access Control
- Organizer-only functions (minting, refunds)
- Admin functions (fraud locking, emergency actions)
- Owner-only marketplace controls

### Reentrancy Protection
```solidity
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
```

### Custom Errors (Gas Optimized)
```solidity
error Unauthorized();
error InsufficientPayment();
error RefundNotAvailable();
error TransferNotAllowed();
```

### Fraud Protection
1. Community reporting
2. Organizer withdrawal lock
3. Emergency refund for all buyers
4. Reputation tracking

---

## Deployment

### Prerequisites
```bash
npm install --save-dev hardhat
npm install @openzeppelin/contracts@5.0.0
```

### Deploy Script
```javascript
// deploy.js
const hre = require("hardhat");

async function main() {
  // 1. Deploy EventOrganizerV2
  const EventOrganizer = await hre.ethers.getContractFactory("EventOrganizerV2");
  const organizer = await EventOrganizer.deploy();
  await organizer.waitForDeployment();

  // 2. Deploy NFTMarketplaceV2
  const Marketplace = await hre.ethers.getContractFactory("NFTMarketplaceV2");
  const marketplace = await Marketplace.deploy();
  await marketplace.waitForDeployment();

  console.log("EventOrganizerV2:", await organizer.getAddress());
  console.log("NFTMarketplaceV2:", await marketplace.getAddress());
}
```

### Network Config (hardhat.config.js)
```javascript
module.exports = {
  solidity: "0.8.19",
  networks: {
    pushchain: {
      url: "https://api.testnet.pushchain.com/rpc",
      chainId: 50311,
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};
```

---

## Usage Examples

### Create Event
```javascript
// 1. Register as organizer
await eventOrganizer.registerOrganizer("My Events", "hello@myevents.com");

// 2. Deploy ticket contract
const EventTicket = await ethers.getContractFactory("EventTicketV3");
const ticket = await EventTicket.deploy(
  "Concert 2025",
  "CONCERT",
  eventOrganizerAddress,
  ethers.parseEther("0.1"), // price
  1000, // max supply
  Math.floor(Date.now() / 1000) + 86400 * 30 // refund deadline
);

// 3. Register with organizer
await eventOrganizer.registerEvent(
  await ticket.getAddress(),
  "Concert 2025",
  Math.floor(Date.now() / 1000) + 86400 * 60
);
```

### Buy Ticket
```javascript
await ticketContract.mintTicket(
  buyerAddress,
  "VIP",
  "A1",
  "12",
  { value: ethers.parseEther("0.1") }
);
```

### List on Marketplace
```javascript
// Approve marketplace
await ticketContract.approve(marketplaceAddress, tokenId);

// List for sale
await marketplace.listNFT(
  ticketContractAddress,
  tokenId,
  ethers.parseEther("0.15")
);
```

### Request Refund
```javascript
await ticketContract.refundTicket(tokenId);
```

---

## Gas Optimization

**Techniques Used:**
- Custom errors instead of require strings
- Unchecked math in loops
- Batch operations for multiple tickets
- Minimal storage reads
- Event indexing for off-chain queries

**Estimated Gas Costs:**
| Operation | Gas Cost |
|-----------|----------|
| Register Organizer | ~120k |
| Mint Single Ticket | ~180k |
| Batch Mint (10) | ~900k |
| List NFT | ~80k |
| Buy NFT | ~120k |
| Refund | ~90k |

---

## Testing

```bash
npx hardhat test
```

### Test Coverage
- ✅ Organizer registration & profiles
- ✅ Event creation & registration
- ✅ Ticket minting (single & batch)
- ✅ Refund mechanisms
- ✅ Transfer controls
- ✅ Marketplace listings & sales
- ✅ Offers & auctions
- ✅ Royalty distribution
- ✅ Fraud reporting & locks
- ✅ Emergency refunds

---

## FAQ

**Q: Can tickets be transferred?**
A: Only if organizer enables transfers via `setTransfersEnabled(true)`. Otherwise, use marketplace.

**Q: How do refunds work?**
A: Buyers can request refunds before `refundDeadline`. Organizer can enable/disable anytime.

**Q: What happens if fraud is detected?**
A: Admin can lock organizer withdrawals and trigger emergency refunds for all buyers.

**Q: How are royalties paid?**
A: 5% of secondary sales automatically sent to event organizer via EIP-2981.

**Q: Can organizers withdraw instantly?**
A: Yes, unless fraud is detected or contract is locked.

**Q: What if event is cancelled?**
A: Organizer calls `emergencyRefundAll()` to refund all ticket holders.

---

## License

MIT License - see LICENSE file

---

## Support

- Documentation: [docs.intic.id](https://intic.id)
- GitHub: [github.com/intic-id](https://github.com/intic-id)
- Discord: [discord.gg/intic](https://discord.gg/intic)

---


