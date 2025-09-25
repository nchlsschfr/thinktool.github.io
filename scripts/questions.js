document.addEventListener("DOMContentLoaded", () => {
	const questionArea = document.querySelector(".question-area p");
	const answerInputBox = document.getElementById("answerInput");
	const commandInputBox = document.getElementById("commandInput");
	const operators = {
		"addition": "+",
		"subtraction": "-",
		"multiplication": "×",
		"division": "÷"
	}
	let mode = "addition"
	let lastNumbers = [];
	let termCount = 2; 
	let termLengths = [2, 2]; 
	let trialDuration = 60; 
	let currentTrial = null;

	const commands = {
		"op": {
			description: "change the operator",
			usage: "op [operator]",
			validArgs: ["addition", "subtraction", "multiplication", "division"],
			execute: (args) => {
				if (!args || args.length === 0) {
					return "error: please specify a operator. valid operators: " + commands.op.validArgs.join(", ");
				}
				const newMode = args[0].toLowerCase();
				if (commands.op.validArgs.includes(newMode)) {
					mode = newMode;
					refreshQuestion();
					return `mode changed to ${newMode}`;
				} else {
					return "error: invalid operator. Valid operators: " + commands.op.validArgs.join(", ");
				}
			}
		},
		"tl": {
			description: "change term length",
			usage: "tl [termlength1 termlength2 etc]",
			execute: (args) => {
				if (!args || args.length === 0) {
					return "error: please specify term lengths (e.g., tl 2 3 for 2-digit and 3-digit terms)";
				}
				
				const newTermLengths = [];
				for (let arg of args) {
					const length = parseInt(arg);
					if (isNaN(length) || length < 1 || length > 5) {
						return "error: term lengths must be numbers between 1 and 5";
					}
					newTermLengths.push(length);
				}
				
				termLengths = newTermLengths;
				termCount = termLengths.length;
				refreshQuestion();
				return `term lengths set to: ${termLengths.join(", ")}`;
			}
		},
		"tc": {
			description: "change the number of terms",
			usage: "tc [termcount]",
			execute: (args) => {
				if (!args || args.length === 0) {
					return "error: please specify a number of terms";
				}
				
				const newCount = parseInt(args[0]);
				if (isNaN(newCount) || newCount < 2 || newCount > 10) {
					return "error: term count must be a number between 2 and 10";
				}
				
				termCount = newCount;

				while (termLengths.length < termCount) {
					termLengths.push(2);
				}
				termLengths = termLengths.slice(0, termCount);
				
				refreshQuestion();
				return `term count set to ${termCount}`;
			}
		},
		"cd": {
			description: "change the duration of the trial",
			usage: "cd [duration]",
			execute: (args) => {
				if (!args || args.length === 0) {
					return "error: please specify a duration in seconds";
				}
				
				const newDuration = parseInt(args[0]);
				if (isNaN(newDuration) || newDuration < 10 || newDuration > 3600) {
					return "error: duration must be a number between 10 and 3600 seconds";
				}
				
				trialDuration = newDuration;
				return `trial duration set to ${trialDuration} seconds`;
			}
		},
		"start": {
			description: "start a timed trial",
			usage: "start",
			execute: () => {
				if (currentTrial) {
					return "error: trial already in progress. Use 'stop' to end current trial";
				}
				
				startTrial();
				return `trial started for ${trialDuration} seconds`;
			}
		},
		"stop": {
			description: "stop the current trial",
			usage: "stop",
			execute: () => {
				if (!currentTrial) {
					return "error: no trial in progress";
				}
				
				const results = stopTrial();
				return `trial stopped. ${results.correct}/${results.total} correct (${Math.round(results.accuracy * 100)}%)`;
			}
		},
		"help": {
			description: "show help information",
			usage: "help",
			execute: () => {
				showHelpWindow();
				return "help window opened";
			}
		}
	};

	function startTrial() {
		currentTrial = {
			startTime: Date.now(),
			endTime: Date.now() + (trialDuration * 1000),
			totalQuestions: 0,
			correctAnswers: 0,
			timeLeft: trialDuration
		};
		
		updateTrialDisplay();
		const trialTimer = setInterval(() => {
			const now = Date.now();
			if (now >= currentTrial.endTime) {
				clearInterval(trialTimer);
				const results = stopTrial();
				displayCommandFade(`trial complete! ${results.correct}/${results.total} correct (${Math.round(results.accuracy * 100)}%)`, false);
			} else {
				currentTrial.timeLeft = Math.ceil((currentTrial.endTime - now) / 1000);
				updateTrialDisplay();
			}
		}, 100);
		
		currentTrial.timer = trialTimer;
		refreshQuestion();
	}
	
	function stopTrial() {
		if (!currentTrial) return null;
		
		clearInterval(currentTrial.timer);
		const results = {
			total: currentTrial.totalQuestions,
			correct: currentTrial.correctAnswers,
			accuracy: currentTrial.totalQuestions > 0 ? currentTrial.correctAnswers / currentTrial.totalQuestions : 0
		};
		
		currentTrial = null;
		updateTrialDisplay();
		return results;
	}
	
	function updateTrialDisplay() {
		let trialInfo = document.querySelector('.trial-info');
		if (!trialInfo) {
			trialInfo = document.createElement('div');
			trialInfo.className = 'trial-info';
			trialInfo.style.marginTop = '32px';
			trialInfo.style.fontFamily = '"Hermit", sans-serif';
			trialInfo.style.fontSize = '0.9rem';
			trialInfo.style.color = 'rgba(0,0,0,.4)';	
			trialInfo.style.position = 'relative';
			trialInfo.style.margin = '5 auto';
			trialInfo.style.textAlign = 'center';

			answerInputBox.parentElement.insertBefore(trialInfo, answerInputBox.nextSibling);
		}

		if (currentTrial) {
			trialInfo.textContent = `${currentTrial.timeLeft}s`;
			trialInfo.style.display = 'block';
		} else {
			trialInfo.style.display = 'none';
		}
	}

	let suggestionBox = null;
	
	function createSuggestionBox() {
		if (suggestionBox) return;
		
		suggestionBox = document.createElement("div");
		suggestionBox.className = "suggestion-box";
		suggestionBox.style.display = "none";
		document.querySelector(".footer").appendChild(suggestionBox);
	}

	function showSuggestions(input) {
		if (!suggestionBox) createSuggestionBox();
		
		const suggestions = getSuggestions(input);
		
		if (suggestions.length === 0) {
			suggestionBox.style.display = "none";
			return;
		}

		suggestionBox.innerHTML = "";
		suggestions.forEach(suggestion => {
			const suggestionItem = document.createElement("div");
			suggestionItem.className = "suggestion-item";
			suggestionItem.textContent = suggestion;
			suggestionBox.appendChild(suggestionItem);
		});

		suggestionBox.style.display = "block";
	}

	function getSuggestions(input) {
		if (!input.trim()) return [];
		
		const inputLower = input.toLowerCase();
		const suggestions = [];
		
		Object.keys(commands).forEach(cmd => {
			if (cmd.startsWith(inputLower)) {
				suggestions.push(cmd);
			}
		});

		const parts = input.split(' ');
		if (parts.length > 1) {
			const cmdName = parts[0].toLowerCase();
			const argInput = parts[1].toLowerCase();
			
			if (commands[cmdName] && commands[cmdName].validArgs) {
				commands[cmdName].validArgs.forEach(arg => {
					if (arg.startsWith(argInput)) {
						suggestions.push(`${cmdName} ${arg}`);
					}
				});
			}
		}

		return suggestions.slice(0, 5); 
	}

	function hideSuggestions() {
		if (suggestionBox) {
			suggestionBox.style.display = "none";
		}
	}

	function executeCommand(commandString) {
		const parts = commandString.trim().split(' ');
		const cmdName = parts[0].toLowerCase();
		const args = parts.slice(1);

		if (commands[cmdName]) {
			return commands[cmdName].execute(args);
		} else {
			return `Error: Unknown command '${cmdName}'. Type 'help' for available commands.`;
		}
	}

	function showHelpWindow() {
		const helpWindow = document.createElement("div");
		helpWindow.className = "help-window";
		helpWindow.innerHTML = `
			<div class="help-content">
				<h2>thinktool v1.0</h2>
				<h3>available commands:</h3>
				${Object.entries(commands).map(([name, cmd]) => `
					<div class="command-help">
						<strong>${name}</strong> - ${cmd.description}<br>
						<em>usage: ${cmd.usage}</em>
					</div>
				`).join('')}
				<button class="close-help">close</button>
			</div>
		`;
		
		document.body.appendChild(helpWindow);
		
		helpWindow.querySelector(".close-help").addEventListener("click", () => {
			helpWindow.remove();
		});

		helpWindow.addEventListener("click", (e) => {
			if (e.target === helpWindow) {
				helpWindow.remove();
			}
		});
	}

	function displayCommandFade(commandText, isError = false) {
		const commandFade = document.createElement("div");
		commandFade.textContent = "> " + commandText;
		commandFade.className = "fading-question";
		commandFade.style.position = "absolute";
		commandFade.style.bottom = "30px";
		commandFade.style.left = "10px";
		commandFade.style.textAlign = "left";
		commandFade.style.width = "auto";
		commandFade.style.fontSize = "1rem";
		commandFade.style.fontFamily = '"Hermit", sans-serif';
		commandFade.style.color = isError ? "red" : "rgba(0,0,0,.4)";
		
		document.querySelector(".footer").appendChild(commandFade);
		
		requestAnimationFrame(() => {
			commandFade.classList.add("fade-out");
		});
		
		setTimeout(() => {
			commandFade.remove();
		}, 600);
	}

	function generateRandomNumber(digitLength) {
		if (digitLength === 1) {
			return Math.floor(Math.random() * 9) + 1;
		}
		const min = Math.pow(10, digitLength - 1);
		const max = Math.pow(10, digitLength) - 1;
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}
	
	function generateQuestionData() {
		if (lastNumbers.length === 0) {
			lastNumbers = [0, 0];
			return `0 ${operators[mode]} 0?`;
		}

		lastNumbers = [];
		for (let i = 0; i < termCount; i++) {
			lastNumbers.push(generateRandomNumber(termLengths[i]));
		}

		let questionText = "";
		for (let i = 0; i < lastNumbers.length; i++) {
			if (i > 0) {
				questionText += ` ${operators[mode]} `;
			}
			questionText += lastNumbers[i];
		}
		questionText += "?";

		return questionText;
	}

	
	function calculateCorrectAnswer() {
		if (lastNumbers.length === 0) return 0;
		
		let result = lastNumbers[0];
		for (let i = 1; i < lastNumbers.length; i++) {
			switch(mode) {
				case "addition":
					result += lastNumbers[i];
					break;
				case "subtraction":
					result -= lastNumbers[i];
					break;
				case "multiplication":
					result *= lastNumbers[i];
					break;
				case "division":
					result /= lastNumbers[i];
					break;
			}
		}
		return result;
	}
	
	function refreshQuestion() {
		const userAnswer = parseFloat(answerInputBox.value);
		if (!currentTrial) {
			startTrial();
		}
		const correctAnswer = calculateCorrectAnswer();
		
		let isCorrect = false;
		if (lastNumbers.length > 0) {
			isCorrect = Math.abs(userAnswer - correctAnswer) < 0.001;
			
			if (currentTrial) {
				currentTrial.totalQuestions++;
				if (isCorrect) {
					currentTrial.correctAnswers++;
				}
				updateTrialDisplay();
			}
		}
		
		const oldQuestion = questionArea.textContent;
		const newQuestion = generateQuestionData();
		
		if (oldQuestion && oldQuestion !== "website loaded") {
			const oldQuestionFade = document.createElement("p");
			oldQuestionFade.textContent = oldQuestion;
			oldQuestionFade.className = "fading-question";
			oldQuestionFade.style.color = isCorrect ? "green" : "red";
			
			questionArea.parentElement.appendChild(oldQuestionFade);
			requestAnimationFrame(() => {
				oldQuestionFade.classList.add("fade-out");
			});
			setTimeout(() => {
				oldQuestionFade.remove();
			}, 600);
		}
		
		questionArea.textContent = newQuestion;
		answerInputBox.value = "";
		answerInputBox.focus();
	}

	answerInputBox.addEventListener("keydown", function(event) {
		if(event.key === "Enter") {
			refreshQuestion();
		}
	});

	commandInputBox.addEventListener("input", function(event) {
		showSuggestions(event.target.value);
	});

	commandInputBox.addEventListener("keydown", function(event) {
		if(event.key === "Enter") {
			const commandString = event.target.value.trim();
			if (commandString) {
				const result = executeCommand(commandString);
				const isError = result.toLowerCase().startsWith("error:");
				displayCommandFade(isError ? result : commandString, isError);
				event.target.value = "";
				hideSuggestions();
			}
		} else if (event.key === "Escape") {
			hideSuggestions();
		}
	});

	commandInputBox.addEventListener("blur", function() {
		setTimeout(() => hideSuggestions(), 150);
	});

	document.addEventListener("keydown", function(event) {
		if (event.code === "Backquote" || event.key === "`") {
			event.preventDefault(); 
			commandInputBox.focus();
		}
	});

	refreshQuestion();
});