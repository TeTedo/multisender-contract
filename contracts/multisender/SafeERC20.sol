// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.0) (token/ERC20/utils/SafeERC20.sol)

pragma solidity ^0.8.28;

import "./IERC20.sol";
import "./Address.sol";

/**
 * @title SafeERC20
 * @dev Wrappers around ERC20 operations that throw on failure (when the token
 * contract returns false). Tokens that return no value (and instead revert or
 * throw on failure) are also supported, non-reverting calls are assumed to be
 * successful.
 * To use this library you can add a `using SafeERC20 for IERC20;` statement to your contract,
 * which allows you to call the safe operations as `token.safeTransfer(...)`, etc.
 */
library SafeERC20 {
    using Address for address;

    /**
     * @dev An operation with an ERC20 token failed.
     */
    error SafeERC20FailedOperation(address token);

    /**
     * @dev Indicates a failure with the `spender`'s `allowance` of a `token`. Used in transfers.
     * @param spender Address that may be allowed to operate on tokens without being their owner.
     * @param allowance Amount of tokens a `spender` is allowed to operate with.
     * @param needed Minimum amount required to perform a transfer.
     */
    error SafeERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed);

    /**
     * @dev Indicates a failure with the `token`. Used in transfers.
     * @param token Address of the token in question.
     */
    error SafeERC20InsufficientBalance(address token, uint256 balance, uint256 needed);

    /**
     * @dev Indicates a failure with the `approve` of a `token`. Used in approvals.
     * @param token Address of the token in question.
     * @param spender Address that may be allowed to operate on tokens without being their owner.
     */
    error SafeERC20FailedApprove(address token, address spender);

    /**
     * @dev Transfer `value` amount of `token` from the calling contract to `to`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     * @param token The address of the ERC20 token.
     * @param to The destination address of the transfer.
     * @param value The amount of token to transfer.
     * @return True if the call was successful, false if the token returned false.
     */
    function safeTransfer(IERC20 token, address to, uint256 value) internal returns (bool) {
        bytes memory data = abi.encodeCall(IERC20.transfer, (to, value));
        return _callOptionalReturn(token, data);
    }

    /**
     * @dev Transfer `value` amount of `token` from `from` to `to`, spending the approval given by `from` to the
     * calling contract. If `token` returns no value, non-reverting calls are assumed to be successful.
     * @param token The address of the ERC20 token.
     * @param from The source address of the transfer.
     * @param to The destination address of the transfer.
     * @param value The amount of token to transfer.
     * @return True if the call was successful, false if the token returned false.
     */
    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal returns (bool) {
        bytes memory data = abi.encodeCall(IERC20.transferFrom, (from, to, value));
        return _callOptionalReturn(token, data);
    }

    /**
     * @dev Increase the calling contract's allowance toward `spender` by `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     * @param token The address of the ERC20 token.
     * @param spender The address that may be allowed to operate on tokens without being their owner.
     * @param value The amount of token to increase the allowance by.
     * @return True if the call was successful, false if the token returned false.
     */
    function safeIncreaseAllowance(IERC20 token, address spender, uint256 value) internal returns (bool) {
        uint256 oldAllowance = token.allowance(address(this), spender);
        return safeIncreaseAllowance(token, spender, oldAllowance, value);
    }

    /**
     * @dev Increase the calling contract's allowance toward `spender` by `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     * @param token The address of the ERC20 token.
     * @param spender The address that may be allowed to operate on tokens without being their owner.
     * @param requestedValue The amount of token to increase the allowance by.
     * @param currentValue The current allowance of the token.
     * @return True if the call was successful, false if the token returned false.
     */
    function safeIncreaseAllowance(
        IERC20 token,
        address spender,
        uint256 requestedValue,
        uint256 currentValue
    ) internal returns (bool) {
        unchecked {
            uint256 newAllowance = currentValue + requestedValue;
            return safeApprove(token, spender, newAllowance, currentValue);
        }
    }

    /**
     * @dev Decrease the calling contract's allowance toward `spender` by `requestedDecrease`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     * @param token The address of the ERC20 token.
     * @param spender The address that may be allowed to operate on tokens without being their owner.
     * @param requestedDecrease The amount of token to decrease the allowance by.
     * @return True if the call was successful, false if the token returned false.
     */
    function safeDecreaseAllowance(IERC20 token, address spender, uint256 requestedDecrease) internal returns (bool) {
        uint256 currentAllowance = token.allowance(address(this), spender);
        if (currentAllowance < requestedDecrease) {
            revert SafeERC20InsufficientAllowance(spender, currentAllowance, requestedDecrease);
        }
        return safeDecreaseAllowance(token, spender, requestedDecrease, currentAllowance);
    }

    /**
     * @dev Decrease the calling contract's allowance toward `spender` by `requestedDecrease`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     * @param token The address of the ERC20 token.
     * @param spender The address that may be allowed to operate on tokens without being their owner.
     * @param requestedDecrease The amount of token to decrease the allowance by.
     * @param currentValue The current allowance of the token.
     * @return True if the call was successful, false if the token returned false.
     */
    function safeDecreaseAllowance(
        IERC20 token,
        address spender,
        uint256 requestedDecrease,
        uint256 currentValue
    ) internal returns (bool) {
        unchecked {
            uint256 newAllowance = currentValue - requestedDecrease;
            return safeApprove(token, spender, newAllowance, currentValue);
        }
    }

    /**
     * @dev Set the calling contract's allowance toward `spender` to `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful. Meant to be used with tokens that require the approval
     * to be set to zero before setting it to a non-zero value, such as USDT.
     * @param token The address of the ERC20 token.
     * @param spender The address that may be allowed to operate on tokens without being their owner.
     * @param value The amount of token to set the allowance to.
     * @return True if the call was successful, false if the token returned false.
     */
    function forceApprove(IERC20 token, address spender, uint256 value) internal returns (bool) {
        bytes memory data = abi.encodeCall(IERC20.approve, (spender, value));
        return _callOptionalReturn(token, data);
    }

    /**
     * @dev Set the calling contract's allowance toward `spender` to `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful. Meant to be used with tokens that require the approval
     * to be set to zero before setting it to a non-zero value, such as USDT.
     * @param token The address of the ERC20 token.
     * @param spender The address that may be allowed to operate on tokens without being their owner.
     * @param value The amount of token to set the allowance to.
     * @param currentValue The current allowance of the token.
     * @return True if the call was successful, false if the token returned false.
     */
    function safeApprove(IERC20 token, address spender, uint256 value, uint256 currentValue) internal returns (bool) {
        if (currentValue == value) {
            return true;
        }

        if (currentValue != 0) {
            (bool success, ) = address(token).call(abi.encodeCall(IERC20.approve, (spender, 0)));
            if (!success) {
                return false;
            }
        }

        return _callOptionalReturn(token, abi.encodeCall(IERC20.approve, (spender, value)));
    }

    /**
     * @dev Imitates a Solidity high-level call (i.e. a regular function call to a contract), relaxing the requirement
     * on the return value: the return value is optional (but if data is returned, it must not be false).
     * @param token The token targeted by the call.
     * @param data The call data (encoded using abi.encode or one of its variants).
     * @return True if the call was successful, false if the token returned false.
     */
    function _callOptionalReturn(IERC20 token, bytes memory data) private returns (bool) {
        // We need to perform a low level call here, to bypass Solidity's return data size checking mechanism, since
        // we're implementing it ourselves. We use {Address.functionCall} to perform this call, which verifies that
        // the target address contains contract code and also asserts for success in the low-level call.

        bytes memory returndata = address(token).functionCall(data);
        return returndata.length == 0 ? true : abi.decode(returndata, (bool));
    }
}
