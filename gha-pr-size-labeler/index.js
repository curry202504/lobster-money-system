const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
    try {
        const token = core.getInput('github-token', { required: true });
        const xsMax = parseInt(core.getInput('xs-max')) || 10;
        const sMax = parseInt(core.getInput('s-max')) || 50;
        const mMax = parseInt(core.getInput('m-max')) || 200;
        const lMax = parseInt(core.getInput('l-max')) || 500;

        const octokit = github.getOctokit(token);
        const context = github.context;
        const { pull_request } = context.payload;

        if (!pull_request) {
            core.setFailed('Not a pull request event');
            return;
        }

        const owner = context.repo.owner;
        const repo = context.repo.repo;
        const prNumber = pull_request.number;

        // Get PR details to find lines changed
        const { data: pr } = await octokit.rest.pulls.get({
            owner,
            repo,
            pull_number: prNumber,
        });

        const additions = pr.additions || 0;
        const deletions = pr.deletions || 0;
        const totalChanges = additions + deletions;

        // Determine size label
        let sizeLabel;
        if (totalChanges <= xsMax) sizeLabel = 'size/xs';
        else if (totalChanges <= sMax) sizeLabel = 'size/s';
        else if (totalChanges <= mMax) sizeLabel = 'size/m';
        else if (totalChanges <= lMax) sizeLabel = 'size/l';
        else sizeLabel = 'size/xl';

        core.info(`PR #${prNumber}: ${totalChanges} changes → ${sizeLabel}`);

        // Remove existing size labels
        const { data: currentLabels } = await octokit.rest.issues.listLabelsOnIssue({
            owner,
            repo,
            issue_number: prNumber,
        });

        const sizeLabels = ['size/xs', 'size/s', 'size/m', 'size/l', 'size/xl'];
        const labelsToRemove = currentLabels
            .filter(l => sizeLabels.includes(l.name))
            .map(l => l.name);

        for (const label of labelsToRemove) {
            await octokit.rest.issues.removeLabel({
                owner,
                repo,
                issue_number: prNumber,
                name: label,
            }).catch(() => {}); // Ignore if label doesn't exist
        }

        // Ensure the label exists in the repo, then add it
        await octokit.rest.issues.createLabel({
            owner,
            repo,
            name: sizeLabel,
            color: getLabelColor(sizeLabel),
        }).catch(() => {}); // Ignore if label already exists

        await octokit.rest.issues.addLabels({
            owner,
            repo,
            issue_number: prNumber,
            labels: [sizeLabel],
        });

        core.setOutput('size', sizeLabel);
        core.setOutput('changes', totalChanges.toString());
        core.info(`✅ Labeled PR #${prNumber} as ${sizeLabel}`);
    } catch (error) {
        core.setFailed(error.message);
    }
}

function getLabelColor(label) {
    const colors = {
        'size/xs': '#0E8A16', // green
        'size/s': '#1D76DB',  // blue
        'size/m': '#FBBD08',  // yellow
        'size/l': '#E99695',  // pink
        'size/xl': '#B60205', // red
    };
    return colors[label] || '#000000';
}

run();
