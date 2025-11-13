"use client";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

import { socket } from "../../../lib/socket";
import ThemeToggleButton from "@/src/components/ThemeToggleButton";

interface Message {
	from: string;
	to?: string;
	message: string;
}

export default function ChatPage() {
	const [username, setUsername] = useState("");
	const [users, setUsers] = useState<string[]>([]);
	const [selectedUser, setSelectedUser] = useState<string | null>(null);
	const [message, setMessage] = useState("");
	const [groups, setGroups] = useState<Record<string, string[]>>({});
	const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<"private" | "group">("private");
	const [privateChats, setPrivateChats] = useState<Record<string, Message[]>>({});
	const [groupChats, setGroupChats] = useState<Record<string, Message[]>>({});
	const [unreadChats, setUnreadChats] = useState<Set<string>>(new Set());

	// ----- Setup socket listeners -----
	useEffect(() => {
		socket.on("connect", () => {
			console.log("Connected:", socket.id);
			if (username) {
				socket.emit("register_user", { username });
			}
		});
		socket.on("update_user_list", (userList) => {
			setUsers(userList);
		});

		socket.off("error_message");
		socket.on("error_message", (data) => {
			alert(data.message);
		});

		// ✅ Private messages
		socket.off("receive_private_message");
		socket.on("receive_private_message", (data: Message) => {
			const from = data.from;
			const to = data.to;
			const chatKey = from === username ? to! : from;

			if (chatKey !== selectedUser) {
				setUnreadChats(prev => new Set(prev).add(chatKey));
			}

			setPrivateChats((prev) => ({
				...prev,
				[chatKey]: [...(prev[chatKey] || []), data],
			}));
		});

		// ✅ Groups
		socket.off("update_group_list");
		socket.on("update_group_list", (data) => {
			setGroups(data);
		});

		socket.off("receive_group_message");
		socket.on("receive_group_message", (data) => {
			const group = data.group;

			if (group !== selectedGroup) {
				setUnreadChats(prev => new Set(prev).add(group));
			}

			setGroupChats((prev) => ({
				...prev,
				[group]: [...(prev[group] || []), data],
			}));
		});

		socket.on("group_notification", (data) => {
			console.log(data.message);
		});

		return () => {
			socket.off("update_user_list");
			socket.off("receive_private_message");
			socket.off("receive_group_message");
		};
	}, [username]);


	// ----- Join Chat -----
	const register = () => {
		if (!username) return alert("Enter username!");
		socket.emit("register_user", { username });
	};

	// ----- Send Message -----
	const sendPrivateMessage = () => {
		if (!selectedUser) return alert("Select a user!");
		socket.emit("send_private_message", { to: selectedUser, message });
		setPrivateChats((prev) => ({
			...prev,
			[selectedUser]: [
				...(prev[selectedUser] || []),
				{ from: username, to: selectedUser, message },
			],
		}));
		setMessage("");
	};

	const sendGroupMessage = () => {
		if (!selectedGroup) return;
		socket.emit("send_group_message", { group: selectedGroup, message });
		setGroupChats((prev) => ({
			...prev,
			[selectedGroup]: [
				...(prev[selectedGroup] || []),
				{ from: username, message },
			],
		}));
		setMessage("");
	};



	return (
		<div className="flex h-screen bg-yellow-100/30 bg-white dark:bg-slate-800">
			{/* Sidebar */}
			<div className="w-1/3 border-r p-4 dark:border-white">
				<h1 className="text-xl font-bold mb-2 dark:text-white">Chat App</h1>

				{/* Username input */}
				<div className="mb-3">
					<input
						className="border p-2 w-full mb-2 shadow-md rounded rounded-xl focus:bg-yellow-100 hover:scale-102 
                        duration-300 delay-25 transition-all dark:border-white dark:placeholder-white dark:focus:bg-sky-800"
						placeholder="Enter username"
						value={username}
						onChange={(e) => setUsername(e.target.value)}
					/>
					<button
						onClick={register}
						className="bg-yellow-400 shadow-md rounded rounded-xl text-black p-2 mt-1 w-full hover:scale-102 hover:shadow-xl 
                        active:bg-yellow-500 duration-300 delay-25 transition-all border border-transparent hover:border-yellow-900
                        dark:bg-amber-700 active:bg-amber-600 dark:hover:border-amber-50 dark:text-white"
					>
						{username ? "Reconnect" : "Join"}
					</button>
				</div>

				{/* Tabs */}
				<div className="flex mb-3 pb-3 border-b dark:border-white">
					<button
						className={`rounded rounded-xl flex-1 p-2 hover:bg-blue-100/50 duration-300 delay-25 dark:text-white
                            ${activeTab === "private" ? "bg-blue-100 font-semibold dark:bg-sky-700" : ""
							}`}
						onClick={() => setActiveTab("private")}
					>
						Private
					</button>
					<button
						className={`rounded rounded-xl flex-1 p-2 hover:bg-purple-100/50 duration-300 delay-25 dark:text-white
                            ${activeTab === "group" ? "bg-purple-100 font-semibold dark:bg-violet-700" : ""
							}`}
						onClick={() => setActiveTab("group")}
					>
						Group
					</button>
				</div>

				{/* Private Tab */}
				{activeTab === "private" && (
					<div>
						<h2 className="font-semibold dark:text-white">Connected users:</h2>
						<ul>
							{users
								.filter((u) => u !== username)
								.map((u) => (
									<li
										key={u}
										onClick={() => {
											setSelectedUser(u);
											setSelectedGroup(null);
											setUnreadChats(prev => {
												const newSet = new Set(prev);
												newSet.delete(u);
												return newSet;
											});
										}}
										className={`cursor-pointer p-2 rounded rounded-xl hover:bg-blue-100/50 duration-300 delay-25 
                                            acive:bg-blue-100 ${selectedUser === u ? "bg-blue-100" : unreadChats.has(u) ? "bg-red-100 font-semibold" : ""
											}`}
									>
										{unreadChats.has(u) ? u + "!!!" : u}
									</li>
								))}
						</ul>
					</div>
				)}

				{/* Group Tab */}
				{activeTab === "group" && (
					<div>
						<h2 className="font-semibold mb-2 dark:text-white">Groups:</h2>
						{!username ? (
							<p className="text-gray-500 mb-2 dark:text-gray-100">Please join (register) to see and create groups.</p>
						) : (
							<>
								<input
									className="border p-2 w-full mb-2 shadow-md rounded rounded-xl focus:bg-purple-100 hover:scale-101 duration-300 
									delay-25 transition-all"
									placeholder="New group name"
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											const input = e.currentTarget;
											const groupName = input.value.trim();

											if (groupName) {
												socket.emit("create_group", { group: groupName });
												input.value = "";
												input.disabled = true;

												setTimeout(() => {
													input.disabled = false;
												}, 1000);
											}
										}
									}}
								/>
								<ul>
									{Object.keys(groups).length === 0 && (
										<p className="text-gray-400 text-sm">No groups yet</p>
									)}
									{Object.keys(groups).map((g) => (
										<li
											key={g}
											onClick={() => {
												setSelectedGroup(g);
												setSelectedUser(null);
												socket.emit("join_group", { group: g });
												setUnreadChats(prev => {
													const newSet = new Set(prev);
													newSet.delete(g);
													return newSet;
												});
											}}
											className={`cursor-pointer p-2 rounded rounded-xl hover:bg-purple-100/50 duration-300 delay-25 acive:bg-purple-100 ${selectedGroup === g ? "bg-purple-100" : unreadChats.has(g) ? "bg-red-100 font-semibold" : ""
												}`}
										>
											{unreadChats.has(g) ? g + "!!!" : g} ({groups[g]?.length || 0})
										</li>
									))}
								</ul>
							</>)}
					</div>

				)}
			</div>

			{/* Chat area */}
			<div className="flex-1 p-4 flex flex-col">
				<ThemeToggleButton className="mr-3 mt-2" />
				{selectedUser ? (
					<>
						<h2 className="text-lg font-bold mb-2">Chat with {selectedUser}</h2>
						<div className="flex-1 border p-2 overflow-y-auto rounded rounded-xl bg-blue-100/50">
							{(privateChats[selectedUser] || []).map((msg, i) => (
								<p
									key={i}
									className={
										msg.from === username
											? "text-right text-blue-700"
											: "text-left text-gray-800"
									}
								>
									<strong>{msg.from === username ? "You" : msg.from}:</strong>{" "}
									{msg.message}
								</p>
							))}
						</div>
						<div className="mt-2 flex">
							<input
								className="border p-2 w-full mt-2 shadow-md rounded rounded-xl focus:bg-blue-100 hover:scale-101 duration-300 delay-25 transition-all flex-1 mr-2"
								value={message}
								onChange={(e) => setMessage(e.target.value)}
								placeholder="Type a message..."
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										sendPrivateMessage();
									}
								}}
							/>
							<button
								onClick={sendPrivateMessage}
								className="bg-blue-400 shadow-md rounded rounded-xl mt-2 text-white p-2 hover:scale-102 hover:shadow-xl active:bg-blue-500 duration-300 delay-25 transition-all border border-transparent hover:border-blue-900"
							>
								Send
							</button>
						</div>
					</>
				) : selectedGroup ? (
					<>
						<h2 className="text-lg font-bold mb-2">Group: {selectedGroup}</h2>
						<div className="flex-1 border p-2 overflow-y-auto rounded rounded-xl bg-purple-100/50">
							{(groupChats[selectedGroup] || []).map((msg, i) => (
								<p
									key={i}
									className={
										msg.from === username
											? "text-right text-purple-700"
											: "text-left text-gray-800"
									}
								>
									<strong>{msg.from === username ? "You" : msg.from}:</strong>{" "}
									{msg.message}
								</p>
							))}
						</div>
						<div className="mt-2 flex">
							<input
								className="flex-1 mr-2 border p-2 w-full mt-2 shadow-md rounded rounded-xl focus:bg-purple-100 hover:scale-102 duration-300 delay-25 transition-all"
								value={message}
								onChange={(e) => setMessage(e.target.value)}
								placeholder="Message group..."
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										sendGroupMessage();
									}
								}}
							/>
							<button
								onClick={sendGroupMessage}
								className="bg-purple-400 shadow-md rounded rounded-xl mt-2 text-white p-2 hover:scale-102 hover:shadow-xl active:bg-purple-500 duration-300 delay-25 transition-all border border-transparent hover:border-purple-900"
							>
								Send
							</button>
						</div>
					</>
				) : (
					<div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-100">
						Select a user or group to start chatting 💬
					</div>
				)}
			</div>
		</div>
	);
}
