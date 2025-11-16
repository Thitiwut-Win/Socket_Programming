"use client";
import { useEffect, useState } from "react";

import { socket } from "../../../lib/socket";
import ThemeToggleButton from "@/src/components/ThemeToggleButton";
import Link from "next/link";

interface Message {
	from: string;
	to?: string;
	type?: "text" | "image";
	message?: string;   // optional for text
	image?: string;     // optional for image (base64)
}

export default function ChatPage() {
	const [username, setUsername] = useState("");
	const [users, setUsers] = useState<string[]>([]);
	const [selectedUser, setSelectedUser] = useState<string | null>(null);
	const [message, setMessage] = useState("");
	const [groups, setGroups] = useState<Record<string, string[]>>({});
	const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<"private" | "group" | "ai">("private");
	const [privateChats, setPrivateChats] = useState<Record<string, Message[]>>({});
	const [groupChats, setGroupChats] = useState<Record<string, Message[]>>({});
	const [unreadChats, setUnreadChats] = useState<Set<string>>(new Set());
	const [aiMessages, setAiMessages] = useState<Message[]>([]);


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

		socket.off("ai_response");
		socket.on("ai_response", (data: Message) => {
			setAiMessages((prev) => [...prev, data]);
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

	const sendAIMessage = () => {
		if (!message) return;

		setAiMessages((prev) => [
			...prev,
			{ from: username, message }
		]);

		socket.emit("ask_ai", { message });
		setMessage("");
	};

	const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();

		reader.onloadend = () => {
			const base64String = reader.result as string;

			if (activeTab === "ai") {
				// AI image upload not supported by backend/chat AI service
				alert("AI image upload is not supported yet.");
				return;
			}

			if (activeTab === "private") {
				if (!selectedUser) return alert("Select a user to send the image to.");

				socket.emit("send_private_message", {
					to: selectedUser,
					type: "image",
					image: base64String,
				});

				setPrivateChats((prev) => ({
					...prev,
					[selectedUser]: [
						...(prev[selectedUser] || []),
						{ from: username, to: selectedUser, type: "image", image: base64String },
					],
				}));

				setUnreadChats(prev => {
					const newSet = new Set(prev);
					newSet.delete(selectedUser);
					return newSet;
				});

				return;
			}

			if (activeTab === "group") {
				if (!selectedGroup) return alert("Select a group to send the image to.");

				socket.emit("send_group_message", { group: selectedGroup, type: "image", image: base64String });

				setGroupChats((prev) => ({
					...prev,
					[selectedGroup]: [
						...(prev[selectedGroup] || []),
						{ from: username, type: "image", image: base64String },
					],
				}));

				setUnreadChats(prev => {
					const newSet = new Set(prev);
					newSet.delete(selectedGroup);
					return newSet;
				});

				return;
			}
		};

		reader.readAsDataURL(file);  // Convert to base64
	};

	return (
		<div className="flex flex-col sm:flex-row h-screen bg-yellow-100/30 bg-white dark:bg-slate-800 overflow-y-auto">
			{/* Sidebar */}
			<div className="sm:w-1/3 border-r p-4 dark:border-white w-[100vw]">
				<Link href={"/"}>
					<button
						className="px-5 py-2 bg-yellow-400 text-black rounded-xl shadow-md hover:scale-105 hover:shadow-xl
          active:bg-yellow-500 transition-all duration-300 border border-transparent hover:border-yellow-900 dark:bg-amber-700 
          dark:text-white dark:hover:border-amber-50">
						Back
					</button>
				</Link>
				<h1 className="text-xl font-bold my-3 dark:text-white">Chat App</h1>

				{/* Username input */}
				<div className="mb-3">
					<input
						className="border p-2 w-full mb-2 shadow-md rounded rounded-xl focus:bg-yellow-100 hover:scale-102 
                        duration-300 delay-25 transition-all dark:border-white dark:text-white dark:placeholder-white dark:focus:bg-sky-800"
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
					<button
						className={`rounded rounded-xl flex-1 p-2 hover:bg-green-100/50 duration-300 delay-25 dark:text-white
                            ${activeTab === "ai" ? "bg-green-100 font-semibold dark:bg-green-700" : ""}
                        `}
						onClick={() => {
							setActiveTab("ai");
							setSelectedUser(null);
							setSelectedGroup(null);
						}}
					>
						AI Chat
					</button>
				</div>

				{/* Private Tab */}
				{activeTab === "private" && (
					<div>
						<h2 className="font-semibold dark:text-white">Connected users:</h2>
						<ul>
							<li className="cursor-pointer p-2 rounded rounded-xl hover:bg-blue-100/50 duration-300 delay-25 
							dark:text-white acive:bg-blue-100">{username}</li>
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
										className={`cursor-pointer p-2 rounded rounded-xl hover:bg-blue-100/50 duration-300 delay-25 dark:text-white
                        acive:bg-blue-100 ${selectedUser === u ? "bg-blue-100 dark:bg-blue-800" : unreadChats.has(u) ? "bg-red-100 dark:bg-indigo-800 font-semibold" : ""
											}`}
									>
										{unreadChats.has(u) ? u + " !unread messages!" : u}
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
									delay-25 transition-all dark:placeholder-gray-100 dark:border-gray-100"
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
										<p className="text-gray-400 text-sm dark:text-gray-100">No groups yet</p>
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
											className={`cursor-pointer p-2 rounded rounded-xl hover:bg-purple-100/50 duration-300 delay-25 acive:bg-purple-100 dark:text-gray-100 ${selectedGroup === g ? "bg-purple-100 dark:bg-purple-800" : unreadChats.has(g) ? "bg-red-100 font-semibold" : ""
												}`}
										>
											{unreadChats.has(g) ? g + " !unread messages! " : g} ({groups[g]?.length || 0})
										</li>
									))}
								</ul>
							</>)}
					</div>

				)}

				{/* Ai Tab */}
				{activeTab === "ai" && (
					<>
						<h2 className="text-lg font-bold mb-2 dark:text-gray-100">AI Assistant 🤖</h2>
					</>
				)}

			</div>

			{/* Chat area */}
			<div className="flex-1 p-4 flex flex-col">
				<ThemeToggleButton className="mr-3 mt-2" />
				{activeTab === "ai" ? (
					<div className="flex flex-col h-full">
						<h2 className="text-lg font-bold mb-2 dark:text-gray-100">AI Assistant 🤖</h2>

						{/* Chat window */}
						<div className="flex-1 min-h-0 border p-2 overflow-y-auto rounded-xl bg-green-100/50">
							{aiMessages.map((msg, i) => (
								<div key={i} className={`flex ${msg.from === username ? 'justify-end' : 'justify-start'} mb-3`}>
									<div className="flex items-start">
										{msg.from === username ?
											<>

												<div className={`p-2 rounded-xl max-w-lg bg-green-100 text-right dark:bg-emerald-950`}>
													<strong className="block text-sm dark:text-white">You</strong>
													{msg.type === 'image' ? (
														<img src={msg.image} className="max-w-xs rounded-xl shadow mt-1" />
													) : (
														<span className="break-words whitespace-pre-wrap dark:text-white text-right">{msg.message}</span>
													)}
												</div>
												<div className="w-8 h-8 rounded-full bg-green-100 dark:bg-emerald-950 text-sm dark:text-white flex items-center justify-center ml-2">
													{(msg.from || '?')[0].toUpperCase()}
												</div>
											</> :
											<>
												<div className="w-8 h-8 rounded-full bg-white dark:bg-sky-950 dark:text-white text-sm flex items-center justify-center mr-2">
													{(msg.from || '?')[0].toUpperCase()}
												</div>
												<div className={`p-2 rounded-xl max-w-lg bg-white text-left dark:bg-sky-950`}>
													<strong className="block text-sm dark:text-white">{msg.from}</strong>
													{msg.type === 'image' ? (
														<img src={msg.image} className="max-w-xs rounded-xl shadow mt-1" />
													) : (
														<span className="break-words whitespace-pre-wrap dark:text-white">{msg.message}</span>
													)}
												</div>
											</>
										}
									</div>
								</div>
							))}
						</div>

						{/* Input section */}
						<div className="mt-2 flex pb-10">
							<input
								className="border p-2 w-full shadow-md rounded-xl focus:bg-green-100 hover:scale-101 duration-300 dark:border-white dark:placeholder-white dark:focus:text-black dark:text-white dark:focus:placeholder-black"
								value={message}
								onChange={(e) => setMessage(e.target.value)}
								placeholder="Ask AI something..."
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										sendAIMessage();
									}
								}}
							/>

							<button
								onClick={sendAIMessage}
								className="bg-green-500 shadow-md rounded-xl text-white p-2 ml-2 hover:scale-102 hover:shadow-xl"
							>
								Send
							</button>
						</div>
					</div>
				) : selectedUser ? (
					<>
						<h2 className="text-lg font-bold mb-2 dark:text-gray-100">Chat with {selectedUser}</h2>
						<div className="flex-1 border p-2 overflow-y-auto rounded rounded-xl bg-blue-100/50">
							{(privateChats[selectedUser] || []).map((msg, i) => (
								<div key={i} className={`flex ${msg.from === username ? 'justify-end' : 'justify-start'} mb-3`}>
									<div className="flex items-start">
										{msg.from === username ?
											<>

												<div className={`p-2 rounded-xl max-w-lg bg-green-100 text-right dark:bg-emerald-950`}>
													<strong className="block text-sm dark:text-white">You</strong>
													{msg.type === 'image' ? (
														<img src={msg.image} className="max-w-xs rounded-xl shadow mt-1" />
													) : (
														<span className="break-words whitespace-pre-wrap dark:text-white text-right">{msg.message}</span>
													)}
												</div>
												<div className="w-8 h-8 rounded-full bg-green-100 dark:bg-emerald-950 text-sm dark:text-white flex items-center justify-center ml-2">
													{(msg.from || '?')[0].toUpperCase()}
												</div>
											</> :
											<>
												<div className="w-8 h-8 rounded-full bg-white dark:bg-sky-950 dark:text-white text-sm flex items-center justify-center mr-2">
													{(msg.from || '?')[0].toUpperCase()}
												</div>
												<div className={`p-2 rounded-xl max-w-lg bg-white text-left dark:bg-sky-950`}>
													<strong className="block text-sm dark:text-white">{msg.from}</strong>
													{msg.type === 'image' ? (
														<img src={msg.image} className="max-w-xs rounded-xl shadow mt-1" />
													) : (
														<span className="break-words whitespace-pre-wrap dark:text-white">{msg.message}</span>
													)}
												</div>
											</>
										}
									</div>
								</div>
							))}
						</div>
						<div className="mt-2 flex">
							<input
								className="border p-2 w-full mt-2 shadow-md rounded rounded-xl focus:bg-blue-100 hover:scale-101 duration-300 delay-25 transition-all flex-1 dark:border-white dark:placeholder-white dark:focus:text-black dark:text-white dark:focus:placeholder-black"
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
							<label
								className="cursor-pointer mx-3 p-2 bg-yellow-100 hover:bg-amber-200 rounded-xl shadow-md transition-all duration-200 
    						flex items-center justify-center text-xl dark:bg-slate-700 dark:hover:bg-slate-500">
								🖼️
								<input
									type="file"
									accept="image/*"
									onChange={handleImageUpload}
									className="hidden"
								/>
							</label>
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
						<div className="flex">
							<h2 className="text-lg font-bold mb-2 dark:text-gray-100">Group: {selectedGroup} || members: </h2>
							{
								groups[selectedGroup].map((member: string) => (
									<div className="dark:text-white" key={member}>{`${member},`}</div>
								))
							}
						</div>
						<div className="flex-1 border p-2 overflow-y-auto rounded rounded-xl bg-purple-100/50">
							{(groupChats[selectedGroup] || []).map((msg, i) => (
								<div key={i} className={`flex ${msg.from === username ? 'justify-end' : 'justify-start'} mb-3`}>
									<div className="flex items-start">
										{msg.from === username ?
											<>

												<div className={`p-2 rounded-xl max-w-lg bg-green-100 text-right dark:bg-emerald-950`}>
													<strong className="block text-sm dark:text-white">You</strong>
													{msg.type === 'image' ? (
														<img src={msg.image} className="max-w-xs rounded-xl shadow mt-1" />
													) : (
														<span className="break-words whitespace-pre-wrap dark:text-white text-right">{msg.message}</span>
													)}
												</div>
												<div className="w-8 h-8 rounded-full bg-green-100 dark:bg-emerald-950 text-sm dark:text-white flex items-center justify-center ml-2">
													{(msg.from || '?')[0].toUpperCase()}
												</div>
											</> :
											<>
												<div className="w-8 h-8 rounded-full bg-white dark:bg-sky-950 dark:text-white text-sm flex items-center justify-center mr-2">
													{(msg.from || '?')[0].toUpperCase()}
												</div>
												<div className={`p-2 rounded-xl max-w-lg bg-white text-left dark:bg-sky-950`}>
													<strong className="block text-sm dark:text-white">{msg.from}</strong>
													{msg.type === 'image' ? (
														<img src={msg.image} className="max-w-xs rounded-xl shadow mt-1" />
													) : (
														<span className="break-words whitespace-pre-wrap dark:text-white">{msg.message}</span>
													)}
												</div>
											</>
										}
									</div>
								</div>
							))}
						</div>
						<div className="mt-2 flex">
							<input
								className="flex-1 border p-2 w-full mt-2 shadow-md rounded rounded-xl focus:bg-purple-100 hover:scale-102 duration-300 delay-25 transition-all dark:placeholder-gray-100 dark:text-white dark:focus:text-black dark:border-white dark:focus:placeholder-black"
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
							<label
								className="cursor-pointer mx-3 p-2 bg-yellow-100 hover:bg-amber-200 rounded-xl shadow-md transition-all duration-200 
    						flex items-center justify-center text-xl dark:bg-slate-700 dark:hover:bg-slate-500">
								🖼️
								<input
									type="file"
									accept="image/*"
									onChange={handleImageUpload}
									className="hidden"
								/>
							</label>
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
				)
				}
			</div >
		</div >
	);
}
